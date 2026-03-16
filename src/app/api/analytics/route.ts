import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { KANBAN_COLUMNS } from "@/types";
import type {
  AnalyticsData,
  FunnelStage,
  KeywordGap,
  ResumePerformance,
  ScoreBucket,
  SourceConversion,
  TopEntry,
  WeeklyTrend,
} from "@/types";

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Run all independent queries in parallel ────────────────────────────
    const [
      applicationGroups,
      allJobScores,
      rawWeeklyTrend,
      rawTopTitles,
      rawTopCompanies,
      rawSourceJobs,
      allApplicationsWithSource,
      jobsThisWeek,
      appsThisWeek,
      interviewsThisWeek,
      analysesThisWeek,
      overdueFollowUps,
      avgScoreResult,
      resumesWithAnalyses,
      missingKeywordAnalyses,
    ] = await Promise.all([
      // 1. Application funnel
      prisma.application.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // 2. All job match scores for bucket distribution
      prisma.job.findMany({
        where: { status: { not: "dismissed" } },
        select: { matchScore: true },
      }),

      // 3. Weekly trend — raw SQL for SQLite strftime
      prisma.$queryRaw<Array<{ week: string; avgScore: number; jobCount: number }>>`
        SELECT
          strftime('%Y-W%W', createdAt) AS week,
          CAST(ROUND(AVG(matchScore)) AS INTEGER) AS avgScore,
          COUNT(*) AS jobCount
        FROM Job
        WHERE createdAt >= datetime('now', '-56 days')
          AND status != 'dismissed'
        GROUP BY week
        ORDER BY week ASC
      `,

      // 4. Top titles
      prisma.job.groupBy({
        by: ["title"],
        _count: { _all: true },
        _avg: { matchScore: true },
        orderBy: { _count: { title: "desc" } },
        take: 8,
        where: { status: { not: "dismissed" } },
      }),

      // 5. Top companies
      prisma.job.groupBy({
        by: ["company"],
        _count: { _all: true },
        _avg: { matchScore: true },
        orderBy: { _count: { company: "desc" } },
        take: 8,
        where: { status: { not: "dismissed" } },
      }),

      // 6. Source breakdown (jobs side)
      prisma.job.groupBy({
        by: ["source"],
        _count: { _all: true },
        _avg: { matchScore: true },
        where: { status: { not: "dismissed" } },
      }),

      // 7. Applications with source for conversion calc
      prisma.application.findMany({
        include: { job: { select: { source: true } } },
      }),

      // 8. Weekly activity counts
      prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.application.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.application.count({ where: { status: "interview", updatedAt: { gte: sevenDaysAgo } } }),
      prisma.resumeAnalysis.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.application.count({
        where: {
          followUpDate: { lt: today },
          status: { in: ["applied", "interview"] },
        },
      }),
      prisma.job.aggregate({ _avg: { matchScore: true } }),
      prisma.resume.findMany({
        include: {
          analyses: {
            select: {
              matchScore: true,
            },
          },
        },
      }),
      prisma.resumeAnalysis.findMany({
        select: { missingKeywords: true },
      }),
    ]);

    // ── Build funnel (preserve KANBAN_COLUMNS order, keep 0-count stages) ──
    const funnelMap = new Map(applicationGroups.map((g) => [g.status, g._count._all]));
    const funnel: FunnelStage[] = KANBAN_COLUMNS.map(({ status, label, color }) => ({
      status,
      label,
      count: funnelMap.get(status) ?? 0,
      color,
    }));

    // ── Score buckets ───────────────────────────────────────────────────────
    const bucketDefs: Array<[string, number, number]> = [
      ["0–29", 0, 29],
      ["30–49", 30, 49],
      ["50–69", 50, 69],
      ["70–89", 70, 89],
      ["90–100", 90, 100],
    ];
    const scoreBuckets: ScoreBucket[] = bucketDefs.map(([bucket, min, max]) => ({
      bucket,
      count: allJobScores.filter((j) => j.matchScore >= min && j.matchScore <= max).length,
    }));

    // ── Weekly trend ────────────────────────────────────────────────────────
    const weeklyTrend: WeeklyTrend[] = rawWeeklyTrend.map((row) => ({
      week: row.week,
      avgScore: Number(row.avgScore),
      jobCount: Number(row.jobCount),
    }));

    // ── Top titles ──────────────────────────────────────────────────────────
    const topTitles: TopEntry[] = rawTopTitles.map((r) => ({
      name: r.title,
      count: r._count._all,
      avgScore: Math.round(r._avg.matchScore ?? 0),
    }));

    // ── Top companies ───────────────────────────────────────────────────────
    const topCompanies: TopEntry[] = rawTopCompanies.map((r) => ({
      name: r.company,
      count: r._count._all,
      avgScore: Math.round(r._avg.matchScore ?? 0),
    }));

    // ── Source conversions ──────────────────────────────────────────────────
    const appliedBySource = new Map<string, number>();
    const interviewBySource = new Map<string, number>();
    for (const app of allApplicationsWithSource) {
      const src = app.job.source;
      appliedBySource.set(src, (appliedBySource.get(src) ?? 0) + 1);
      if (app.status === "interview" || app.status === "offer") {
        interviewBySource.set(src, (interviewBySource.get(src) ?? 0) + 1);
      }
    }
    const sourceConversions: SourceConversion[] = rawSourceJobs.map((r) => ({
      source: r.source,
      totalJobs: r._count._all,
      appliedCount: appliedBySource.get(r.source) ?? 0,
      interviewCount: interviewBySource.get(r.source) ?? 0,
      avgScore: Math.round(r._avg.matchScore ?? 0),
    }));

    const resumePerformance: ResumePerformance[] = resumesWithAnalyses
      .filter((resume) => resume.analyses.length > 0)
      .map((resume) => {
        const scores = resume.analyses.map((analysis) => analysis.matchScore);
        return {
          resumeId: resume.id,
          name: resume.name,
          analysisCount: scores.length,
          avgScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
          bestScore: Math.max(...scores),
        };
      })
      .sort((a, b) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        return b.analysisCount - a.analysisCount;
      })
      .slice(0, 6);

    const missingKeywordCounts = new Map<string, number>();
    for (const analysis of missingKeywordAnalyses) {
      const keywords = parseJsonArray(analysis.missingKeywords);
      for (const keyword of keywords) {
        const normalized = keyword.toLowerCase().trim();
        if (!normalized) continue;
        missingKeywordCounts.set(normalized, (missingKeywordCounts.get(normalized) ?? 0) + 1);
      }
    }
    const topMissingKeywords: KeywordGap[] = Array.from(missingKeywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Weekly activity ─────────────────────────────────────────────────────
    const payload: AnalyticsData = {
      funnel,
      scoreBuckets,
      weeklyTrend,
      topTitles,
      topCompanies,
      sourceConversions,
      resumePerformance,
      topMissingKeywords,
      weeklyActivity: {
        jobsScraped: jobsThisWeek,
        applicationsCreated: appsThisWeek,
        interviewsScheduled: interviewsThisWeek,
        analysesCreated: analysesThisWeek,
        overdueFollowUps,
        avgMatchScore: Math.round(avgScoreResult._avg.matchScore ?? 0),
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[analytics] error:", err);
    return NextResponse.json({ error: "Failed to compute analytics" }, { status: 500 });
  }
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
