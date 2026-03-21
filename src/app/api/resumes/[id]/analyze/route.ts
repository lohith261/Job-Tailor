import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeTailor } from "@/lib/ai/tailor";
import { fromJsonArray, toJsonArray } from "@/lib/json-arrays";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { jobId } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const [resume, job] = await Promise.all([
      prisma.resume.findFirst({ where: { id: params.id, userId } }),
      prisma.job.findFirst({ where: { id: jobId, userId } }),
    ]);

    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const analysis = await analyzeTailor({
      resumeText: resume.textContent,
      jobTitle: job.title,
      jobDescription: job.description ?? "",
      jobTags: fromJsonArray(job.tags),
    });

    const saved = await prisma.resumeAnalysis.upsert({
      where: { resumeId_jobId: { resumeId: params.id, jobId } },
      create: {
        resumeId: params.id,
        jobId,
        matchScore: analysis.matchScore,
        presentKeywords: toJsonArray(analysis.presentKeywords),
        missingKeywords: toJsonArray(analysis.missingKeywords),
        suggestions: JSON.stringify(analysis.suggestions),
        summary: analysis.summary,
      },
      update: {
        matchScore: analysis.matchScore,
        presentKeywords: toJsonArray(analysis.presentKeywords),
        missingKeywords: toJsonArray(analysis.missingKeywords),
        suggestions: JSON.stringify(analysis.suggestions),
        summary: analysis.summary,
      },
    });

    return NextResponse.json({
      id: saved.id,
      resumeId: saved.resumeId,
      jobId: saved.jobId,
      matchScore: saved.matchScore,
      presentKeywords: analysis.presentKeywords,
      missingKeywords: analysis.missingKeywords,
      suggestions: analysis.suggestions,
      summary: analysis.summary,
      createdAt: saved.createdAt.toISOString(),
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        locationType: job.locationType,
        matchScore: job.matchScore,
      },
    });
  } catch (err) {
    console.error("POST /api/resumes/[id]/analyze error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
