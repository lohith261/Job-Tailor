import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await req.json().catch(() => ({}));
    const { threshold: rawThreshold, maxJobs: rawMaxJobs, tone: rawTone } = body;

    // Validate and clamp numeric params to safe bounds
    const VALID_TONES = ["professional", "conversational", "enthusiastic"] as const;
    type Tone = typeof VALID_TONES[number];

    const threshold =
      rawThreshold !== undefined
        ? Math.min(100, Math.max(0, Math.trunc(Number(rawThreshold) || 0)))
        : undefined;

    const maxJobs =
      rawMaxJobs !== undefined
        ? Math.min(50, Math.max(1, Math.trunc(Number(rawMaxJobs) || 1)))
        : undefined;

    const tone: Tone | undefined =
      VALID_TONES.includes(rawTone) ? (rawTone as Tone) : undefined;

    const result = await runPipeline({ userId, threshold, maxJobs, tone });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/pipeline/run]", err);
    return NextResponse.json({ error: "Pipeline failed. Please try again." }, { status: 500 });
  }
}
