import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/pipeline/ready
// Returns jobs that have both a ResumeAnalysis AND a CoverLetter, ordered by matchScore desc
export async function GET() {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        analyses: { some: {} },
        coverLetters: { some: {} },
        status: { not: "dismissed" },
      },
      orderBy: { matchScore: "desc" },
      take: 20,
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        coverLetters: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        application: {
          select: { id: true, status: true },
        },
      },
    });

    const result = jobs.map((job) => {
      const analysis = job.analyses[0];
      const coverLetter = job.coverLetters[0];
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        locationType: job.locationType,
        url: job.url,
        source: job.source,
        matchScore: job.matchScore,
        status: job.status,
        application: job.application,
        analysis: analysis
          ? {
              id: analysis.id,
              matchScore: analysis.matchScore,
              presentKeywords: JSON.parse(analysis.presentKeywords || "[]"),
              missingKeywords: JSON.parse(analysis.missingKeywords || "[]"),
              suggestions: JSON.parse(analysis.suggestions || "[]"),
              summary: analysis.summary,
            }
          : null,
        coverLetter: coverLetter
          ? {
              id: coverLetter.id,
              resumeId: coverLetter.resumeId,
              content: coverLetter.content,
              tone: coverLetter.tone,
              preview: coverLetter.content.slice(0, 140),
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pipeline/ready]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
