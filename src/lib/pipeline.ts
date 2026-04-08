import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAllScrapers, filterSeenUrls, markUrlsSeen } from "@/lib/scrapers";
import { calculateMatchScore } from "@/lib/scoring";
import { toJsonArray, fromJsonArray } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";
import { analyzeTailor } from "@/lib/ai/tailor";
import { generateCoverLetter } from "@/lib/ai/cover-letter";
import { generateTailoredResume } from "@/lib/ai/resume-generator";
import { isCancellationRequested, clearCancellation } from "@/lib/pipeline-cancel";
import { sendTelegramMessage } from "@/lib/telegram";

export interface PipelineOptions {
  userId: string;
  threshold?: number;
  maxJobs?: number;
  tone?: "professional" | "conversational" | "enthusiastic";
  /** If provided, reuse this existing PipelineRun record instead of creating a new one. */
  pipelineRunId?: string;
}

export interface PipelineRunResult {
  id: string;
  status: string;
  scrapeCount: number;
  newJobsCount: number;
  analyzedCount: number;
  tailoredResumeCount: number;
  coverLetterCount: number;
  autoTrackedCount: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number;
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineRunResult> {
  const { userId } = options;
  const threshold = options.threshold ?? parseInt(process.env.PIPELINE_SCORE_THRESHOLD ?? "65");
  const maxJobs = options.maxJobs ?? parseInt(process.env.PIPELINE_MAX_JOBS ?? "10");
  const tone = options.tone ?? "professional";

  const errorLog: string[] = [];

  // Clear any leftover cancellation flag from a previous run
  await clearCancellation(userId);

  // Reuse an existing PipelineRun record (created by the API route) or create a fresh one
  const run = options.pipelineRunId
    ? await prisma.pipelineRun.findUniqueOrThrow({ where: { id: options.pipelineRunId } })
    : await prisma.pipelineRun.create({ data: { userId, status: "running" } });

  /** Mark the run as cancelled in the DB and return a result. */
  async function cancelRun(
    scrapeCount: number, newJobsCount: number,
    analyzedCount: number, tailoredResumeCount: number,
    coverLetterCount: number, autoTrackedCount: number
  ): Promise<PipelineRunResult> {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "cancelled",
        completedAt: new Date(),
        scrapeCount, newJobsCount, analyzedCount, tailoredResumeCount,
        coverLetterCount, autoTrackedCount,
        errors: JSON.stringify(errorLog),
      },
    });
    return buildResult(
      run.id, "cancelled", scrapeCount, newJobsCount,
      analyzedCount, tailoredResumeCount, coverLetterCount, autoTrackedCount,
      errorLog, run.startedAt
    );
  }

  try {
    // ─── STEP A: Scrape ───────────────────────────────────────────────────────
    let scrapeCount = 0;
    let newJobsCount = 0;

    try {
      const searchConfig = await getActiveSearchConfig(userId);
      const result = await runAllScrapers(searchConfig);
      scrapeCount = result.totalAfterDedup;

      // Filter out URLs we've already processed in the last 48h (Redis dedup)
      const allUrls = result.jobs.map((j) => j.url);
      const newUrls = new Set(await filterSeenUrls(allUrls));
      const freshJobs = result.jobs.filter((j) => newUrls.has(j.url));

      // Mark these URLs as seen for future runs
      await markUrlsSeen([...newUrls]);

      for (const job of freshJobs) {
        const score = calculateMatchScore(job, searchConfig);
        try {
          const upserted = await prisma.job.upsert({
            where: { title_company_source_userId: { title: job.title, company: job.company, source: job.source, userId } },
            update: { description: job.description, salaryMin: job.salaryMin, salaryMax: job.salaryMax, matchScore: score },
            create: {
              userId,
              title: job.title, company: job.company, location: job.location,
              locationType: job.locationType, url: job.url, source: job.source,
              description: job.description, salaryMin: job.salaryMin, salaryMax: job.salaryMax,
              salaryCurrency: job.salaryCurrency, experienceLevel: job.experienceLevel,
              companySize: job.companySize, industry: job.industry,
              tags: toJsonArray(job.tags || []), postedAt: job.postedAt,
              matchScore: score, status: "new",
            },
          });
          if (upserted) newJobsCount++;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
          errorLog.push(`Scrape upsert failed for "${job.title}": ${String(err)}`);
        }
      }

      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { scrapeCount, newJobsCount },
      });
    } catch (err) {
      errorLog.push(`Scrape step failed: ${String(err)}`);
    }

    // ─── Cancellation check after Step A ─────────────────────────────────────
    if (await isCancellationRequested(userId)) {
      await clearCancellation(userId);
      return await cancelRun(scrapeCount, newJobsCount, 0, 0, 0, 0);
    }

    // ─── STEP B: Select candidates ────────────────────────────────────────────
    const candidates = await prisma.job.findMany({
      where: {
        userId,
        matchScore: { gte: threshold },
        status: { not: "dismissed" },
      },
      orderBy: { matchScore: "desc" },
      take: maxJobs,
      select: {
        id: true, title: true, company: true,
        description: true, tags: true, url: true, matchScore: true,
      },
    });

    // ─── Cancellation check after Step B ─────────────────────────────────────
    if (await isCancellationRequested(userId)) {
      await clearCancellation(userId);
      return await cancelRun(scrapeCount, newJobsCount, 0, 0, 0, 0);
    }

    if (candidates.length === 0) {
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          errors: JSON.stringify(["No jobs above threshold score — pipeline complete with 0 candidates"]),
        },
      });
      return buildResult(run.id, "completed", scrapeCount, newJobsCount, 0, 0, 0, 0,
        ["No jobs above threshold score"], run.startedAt);
    }

    // ─── STEP C: Get primary resume ───────────────────────────────────────────
    const resume = await prisma.resume.findFirst({
      where: { userId, isPrimary: true },
      select: { id: true, textContent: true },
    }) ?? await prisma.resume.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, textContent: true },
    });

    if (!resume) {
      errorLog.push("No resume found — skipping analysis and cover letter steps. Upload a resume first.");
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { status: "completed", completedAt: new Date(), errors: JSON.stringify(errorLog) },
      });
      return buildResult(run.id, "completed", scrapeCount, newJobsCount, 0, 0, 0, 0, errorLog, run.startedAt);
    }

    // ─── Cancellation check after Step C ─────────────────────────────────────
    if (await isCancellationRequested(userId)) {
      await clearCancellation(userId);
      return await cancelRun(scrapeCount, newJobsCount, 0, 0, 0, 0);
    }

    // ─── STEP D + D2: Analyse jobs and generate tailored resumes (combined parallel pass) ──
    const combinedResults = await Promise.allSettled(
      candidates.map(async (job) => {
        const tags = fromJsonArray(job.tags);
        const [analysis, tailoredData] = await Promise.all([
          analyzeTailor({
            resumeText: resume.textContent,
            jobTitle: job.title,
            jobDescription: job.description ?? "",
            jobTags: tags,
          }),
          generateTailoredResume({
            resumeText: resume.textContent,
            jobTitle: job.title,
            jobDescription: job.description ?? "",
            jobTags: tags,
            jobCompany: job.company,
          }),
        ]);

        await prisma.resumeAnalysis.upsert({
          where: { resumeId_jobId: { resumeId: resume.id, jobId: job.id } },
          create: {
            resumeId: resume.id, jobId: job.id,
            matchScore: analysis.matchScore,
            presentKeywords: JSON.stringify(analysis.presentKeywords),
            missingKeywords: JSON.stringify(analysis.missingKeywords),
            suggestions: JSON.stringify(analysis.suggestions),
            summary: analysis.summary,
          },
          update: {
            matchScore: analysis.matchScore,
            presentKeywords: JSON.stringify(analysis.presentKeywords),
            missingKeywords: JSON.stringify(analysis.missingKeywords),
            suggestions: JSON.stringify(analysis.suggestions),
            summary: analysis.summary,
          },
        });

        // Blend AI score (30%) with rule-based score (70%) for a more accurate stored score
        const blendedScore = Math.min(100, Math.max(0,
          Math.round(0.7 * job.matchScore + 0.3 * analysis.matchScore)
        ));
        await prisma.job.update({ where: { id: job.id }, data: { matchScore: blendedScore } });

        await prisma.tailoredResume.upsert({
          where: { resumeId_jobId: { resumeId: resume.id, jobId: job.id } },
          create: {
            resumeId: resume.id, jobId: job.id,
            latexSource: "", resumeJson: JSON.stringify(tailoredData),
            projectedScore: tailoredData.projectedScore,
          },
          update: {
            latexSource: "", resumeJson: JSON.stringify(tailoredData),
            projectedScore: tailoredData.projectedScore,
          },
        });

        return job;
      })
    );

    const successfullyAnalysed = combinedResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<typeof candidates[0]>).value);

    combinedResults
      .filter((r) => r.status === "rejected")
      .forEach((r, i) => {
        errorLog.push(`Analyse+tailor failed for "${candidates[i]?.title ?? i}": ${String((r as PromiseRejectedResult).reason)}`);
      });

    const analyzedCount = successfullyAnalysed.length;
    const tailoredResumeCount = analyzedCount; // both complete together in the combined pass
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { analyzedCount, tailoredResumeCount },
    });

    // ─── Cancellation check after Step D2 ────────────────────────────────────
    if (await isCancellationRequested(userId)) {
      await clearCancellation(userId);
      return await cancelRun(scrapeCount, newJobsCount, analyzedCount, tailoredResumeCount, 0, 0);
    }

    // ─── STEP E: Generate cover letters ──────────────────────────────────────
    const coverLetterResults = await Promise.allSettled(
      successfullyAnalysed.map(async (job) => {
        const content = await generateCoverLetter({
          resumeText: resume.textContent,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description ?? "",
          tone,
        });

        await prisma.coverLetter.upsert({
          where: { resumeId_jobId: { resumeId: resume.id, jobId: job.id } },
          create: { resumeId: resume.id, jobId: job.id, content, tone },
          update: { content, tone },
        });

        return job;
      })
    );

    const successfullyCoverLettered = coverLetterResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<typeof candidates[0]>).value);

    coverLetterResults
      .filter((r) => r.status === "rejected")
      .forEach((r, i) => {
        errorLog.push(`Cover letter failed for job ${successfullyAnalysed[i]?.title ?? i}: ${String((r as PromiseRejectedResult).reason)}`);
      });

    const coverLetterCount = successfullyCoverLettered.length;
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { coverLetterCount },
    });

    // ─── Cancellation check after Step E ─────────────────────────────────────
    if (await isCancellationRequested(userId)) {
      await clearCancellation(userId);
      return await cancelRun(scrapeCount, newJobsCount, analyzedCount, tailoredResumeCount, coverLetterCount, 0);
    }

    // ─── STEP F: Auto-track as bookmarked applications ────────────────────────
    let autoTrackedCount = 0;
    for (const job of successfullyCoverLettered) {
      try {
        await prisma.application.create({
          data: {
            jobId: job.id,
            status: "bookmarked",
            timeline: JSON.stringify([
              {
                id: `evt_${Date.now()}`,
                type: "status_change",
                description: "Added to tracker automatically by Pipeline",
                timestamp: new Date().toISOString(),
              },
            ]),
          },
        });
        autoTrackedCount++;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        errorLog.push(`Auto-track failed for "${job.title}": ${String(err)}`);
      }
    }

    // ─── STEP G: Complete ─────────────────────────────────────────────────────
    clearCancellation(userId);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        tailoredResumeCount,
        autoTrackedCount,
        errors: JSON.stringify(errorLog),
      },
    });

    const result = buildResult(
      run.id, "completed", scrapeCount, newJobsCount,
      analyzedCount, tailoredResumeCount, coverLetterCount, autoTrackedCount,
      errorLog, run.startedAt
    );

    await sendTelegramMessage(
      `<b>Pipeline Complete</b>\n` +
      `Scraped: ${scrapeCount} | New: ${newJobsCount} | Analyzed: ${analyzedCount}\n` +
      `Tailored: ${tailoredResumeCount} | Cover Letters: ${coverLetterCount} | Tracked: ${autoTrackedCount}\n` +
      `Errors: ${errorLog.length} | Duration: ${Math.round(result.durationMs / 1000)}s`
    );

    return result;
  } catch (err) {
    clearCancellation(userId);
    const msg = String(err);
    errorLog.push(`Pipeline failed: ${msg}`);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: "failed", completedAt: new Date(), errors: JSON.stringify(errorLog) },
    });
    await sendTelegramMessage(`<b>Pipeline Failed</b>\n${msg}`);
    throw err;
  }
}

function buildResult(
  id: string, status: string, scrapeCount: number, newJobsCount: number,
  analyzedCount: number, tailoredResumeCount: number,
  coverLetterCount: number, autoTrackedCount: number,
  errors: string[], startedAt: Date
): PipelineRunResult {
  const completedAt = new Date();
  return {
    id, status, scrapeCount, newJobsCount, analyzedCount,
    tailoredResumeCount, coverLetterCount, autoTrackedCount, errors,
    startedAt, completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
