import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

// Vercel calls this endpoint via GET every day at 08:00 UTC.
// The CRON_SECRET is automatically injected as a Bearer token by Vercel in production.
// For local testing: GET /api/cron/daily with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPipeline({
      threshold: parseInt(process.env.PIPELINE_SCORE_THRESHOLD ?? "65"),
      maxJobs: parseInt(process.env.PIPELINE_MAX_JOBS ?? "10"),
      tone: "professional",
    });

    console.log(`[cron/daily] Pipeline completed: runId=${result.id} scraped=${result.scrapeCount} analysed=${result.analyzedCount} coverLetters=${result.coverLetterCount}`);

    return NextResponse.json({ success: true, runId: result.id, result });
  } catch (err) {
    console.error("[cron/daily] Pipeline failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
