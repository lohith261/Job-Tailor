import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runAllScrapers } from "@/lib/scrapers";
import { calculateMatchScore } from "@/lib/scoring";
import { toJsonArray, fromJsonArray } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";
import { analyzeTailor } from "@/lib/ai/tailor";
import { generateCoverLetter } from "@/lib/ai/cover-letter";

export interface PipelineOptions {
  threshold?: number;
  maxJobs?: number;
  tone?: "professional" | "conversational" | "enthusiastic";
}

export interface PipelineRunResult {
  id: string;
  status: string;
  scrapeCount: number;
  newJobsCount: number;
  analyzedCount: number;
  coverLetterCount: number;
  autoTrackedCount: number;
  errors: string[];
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number;
}

export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineRunResult> {
  const threshold = options.threshold ?? parseInt(process.env.PIPELINE_SCORE_THRESHOLD ?? "65");
  const maxJobs = options.maxJobs ?? parseInt(process.env.PIPELINE_MAX_JOBS ?? "10");
  const tone = options.tone ?? "professional";

  const errorLog: string[] = [];

  // Create pipeline run record
  const run = await prisma.pipelineRun.create({
    data: { status: "running" },
  });

  try {
    // ─── STEP A: Scrape ───────────────────────────────────────────────────────
    let scrapeCount = 0;
    let newJobsCount = 0;

    try {
      const searchConfig = await getActiveSearchConfig();
      const result = await runAllScrapers(searchConfig);
      scrapeCount = result.totalAfterDedup;

      for (const job of result.jobs) {
        const score = calculateMatchScore(job, searchConfig);
        try {
          const upserted = await prisma.job.upsert({
            where: { title_company_source: { title: job.title, company: job.company, source: job.source } },
            update: { description: job.description, salaryMin: job.salaryMin, salaryMax: job.salaryMax, matchScore: score },
            create: {
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

    // ─── STEP B: Select candidates ────────────────────────────────────────────
    const candidates = await prisma.job.findMany({
      where: {
        matchScore: { gte: threshold },
        status: { not: "dismissed" },
      },
      orderBy: { matchScore: "desc" },
      take: maxJobs,
      select: {
        id: true, title: true, company: true,
        description: true, tags: true, url: true,
      },
    });

    if (candidates.length === 0) {
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          errors: JSON.stringify(["No jobs above threshold score — pipeline complete with 0 candidates"]),
        },
      });
      return buildResult(run.id, "completed", scrapeCount, newJobsCount, 0, 0, 0,
        ["No jobs above threshold score"], run.startedAt);
    }

    // ─── STEP C: Get primary resume ───────────────────────────────────────────
    const resume = await prisma.resume.findFirst({
      where: { isPrimary: true },
      select: { id: true, textContent: true },
    }) ?? await prisma.resume.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, textContent: true },
    });

    if (!resume) {
      errorLog.push("No resume found — skipping analysis and cover letter steps. Upload a resume first.");
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: { status: "completed", completedAt: new Date(), errors: JSON.stringify(errorLog) },
      });
      return buildResult(run.id, "completed", scrapeCount, newJobsCount, 0, 0, 0, errorLog, run.startedAt);
    }

    // ─── STEP D: Analyse jobs ─────────────────────────────────────────────────
    const analysisResults = await Promise.allSettled(
      candidates.map(async (job) => {
        const tags = fromJsonArray(job.tags);
        const analysis = await analyzeTailor({
          resumeText: resume.textContent,
          jobTitle: job.title,
          jobDescription: job.description ?? "",
          jobTags: tags,
        });

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

        return job;
      })
    );

    const successfullyAnalysed = analysisResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<typeof candidates[0]>).value);

    analysisResults
      .filter((r) => r.status === "rejected")
      .forEach((r, i) => {
        errorLog.push(`Analysis failed for job ${candidates[i]?.title ?? i}: ${String((r as PromiseRejectedResult).reason)}`);
      });

    const analyzedCount = successfullyAnalysed.length;
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { analyzedCount },
    });

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
        // P2002 = already tracked — skip silently
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        errorLog.push(`Auto-track failed for "${job.title}": ${String(err)}`);
      }
    }

    // ─── STEP G: Complete ─────────────────────────────────────────────────────
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        autoTrackedCount,
        errors: JSON.stringify(errorLog),
      },
    });

    return buildResult(
      run.id, "completed", scrapeCount, newJobsCount,
      analyzedCount, coverLetterCount, autoTrackedCount, errorLog, run.startedAt
    );
  } catch (err) {
    const msg = String(err);
    errorLog.push(`Pipeline failed: ${msg}`);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { status: "failed", completedAt: new Date(), errors: JSON.stringify(errorLog) },
    });
    throw err;
  }
}

function buildResult(
  id: string, status: string, scrapeCount: number, newJobsCount: number,
  analyzedCount: number, coverLetterCount: number, autoTrackedCount: number,
  errors: string[], startedAt: Date
): PipelineRunResult {
  const completedAt = new Date();
  return {
    id, status, scrapeCount, newJobsCount, analyzedCount,
    coverLetterCount, autoTrackedCount, errors,
    startedAt, completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  };
}
