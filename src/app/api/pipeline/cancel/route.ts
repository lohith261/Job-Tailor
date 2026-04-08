import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { runs } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/db";
import { requestCancellation } from "@/lib/pipeline-cancel";

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    // Set the soft-cancel flag in Redis (visible to the Trigger.dev worker process)
    await requestCancellation(userId);

    // Find the active run's Trigger.dev handle and cancel it
    const activeRun = await prisma.pipelineRun.findFirst({
      where: { userId, status: "running" },
      orderBy: { startedAt: "desc" },
      select: { id: true, triggerRunId: true },
    });

    if (activeRun?.triggerRunId) {
      await runs.cancel(activeRun.triggerRunId);
    }

    // Mark the run as cancelled in the DB
    if (activeRun) {
      await prisma.pipelineRun.update({
        where: { id: activeRun.id },
        data: { status: "cancelled", completedAt: new Date() },
      });
    }

    return NextResponse.json({ cancelled: true });
  } catch (err) {
    console.error("[POST /api/pipeline/cancel]", err);
    return NextResponse.json(
      { error: "Failed to cancel pipeline." },
      { status: 500 }
    );
  }
}
