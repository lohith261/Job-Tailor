import { NextRequest, NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { userPipelineTask } from "@/trigger/user-pipeline";
import { prisma } from "@/lib/db";

const VALID_TONES = ["professional", "conversational", "enthusiastic"] as const;
type Tone = (typeof VALID_TONES)[number];

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    // Block concurrent runs — check if one is already running
    const activeRun = await prisma.pipelineRun.findFirst({
      where: { userId, status: "running" },
      select: { id: true },
    });
    if (activeRun) {
      return NextResponse.json(
        { error: "A pipeline run is already in progress." },
        { status: 409 }
      );
    }

    const body = await req.json().catch(() => ({})) as {
      threshold?: unknown;
      maxJobs?: unknown;
      tone?: unknown;
    };

    const threshold =
      body.threshold !== undefined
        ? Math.min(100, Math.max(0, Math.trunc(Number(body.threshold) || 0)))
        : undefined;

    const maxJobs =
      body.maxJobs !== undefined
        ? Math.min(50, Math.max(1, Math.trunc(Number(body.maxJobs) || 1)))
        : undefined;

    const tone: Tone | undefined = VALID_TONES.includes(body.tone as Tone)
      ? (body.tone as Tone)
      : undefined;

    // Create the PipelineRun record immediately so the UI can show "running"
    const run = await prisma.pipelineRun.create({
      data: { userId, status: "running" },
    });

    // Dispatch to Trigger.dev — returns immediately, no Vercel timeout risk
    const handle = await userPipelineTask.trigger({
      userId,
      threshold,
      maxJobs,
      tone,
      pipelineRunId: run.id,
    });

    // Store the Trigger.dev run ID so we can cancel it later
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { triggerRunId: handle.id },
    });

    return NextResponse.json({
      started: true,
      pipelineRunId: run.id,
      triggerRunId: handle.id,
    });
  } catch (err) {
    console.error("[POST /api/pipeline/run]", err);
    return NextResponse.json(
      { error: "Failed to start pipeline. Please try again." },
      { status: 500 }
    );
  }
}
