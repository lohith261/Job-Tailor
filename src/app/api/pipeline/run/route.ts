import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

// POST /api/pipeline/run
// Body: { threshold?: number, maxJobs?: number, tone?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { threshold, maxJobs, tone } = body as {
      threshold?: number;
      maxJobs?: number;
      tone?: "professional" | "conversational" | "enthusiastic";
    };

    const result = await runPipeline({ threshold, maxJobs, tone });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/pipeline/run]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
