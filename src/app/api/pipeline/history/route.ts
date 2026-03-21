import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const runs = await prisma.pipelineRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 10,
    });

    const result = runs.map((run) => ({
      id: run.id,
      status: run.status,
      scrapeCount: run.scrapeCount,
      newJobsCount: run.newJobsCount,
      analyzedCount: run.analyzedCount,
      coverLetterCount: run.coverLetterCount,
      autoTrackedCount: run.autoTrackedCount,
      errors: JSON.parse(run.errors || "[]") as string[],
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      durationMs: run.completedAt
        ? run.completedAt.getTime() - run.startedAt.getTime()
        : null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pipeline/history]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
