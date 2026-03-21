import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/pipeline";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    const results = await Promise.allSettled(
      users.map((user) =>
        runPipeline({
          userId: user.id,
          threshold: parseInt(process.env.PIPELINE_SCORE_THRESHOLD ?? "65"),
          maxJobs: parseInt(process.env.PIPELINE_MAX_JOBS ?? "10"),
          tone: "professional",
        })
      )
    );

    const summary = results.map((r, i) => ({
      userId: users[i].id,
      status: r.status,
      ...(r.status === "fulfilled" ? { runId: r.value.id } : { error: String((r as PromiseRejectedResult).reason) }),
    }));

    console.log(`[cron/daily] Completed for ${users.length} users`);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error("[cron/daily] Pipeline failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
