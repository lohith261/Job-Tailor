"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AnalyticsData } from "@/types";
import {
  StatCard,
  FunnelChart,
  ScoreDistributionChart,
  ScoreTrendChart,
  TopListChart,
  ResumePerformanceList,
  KeywordGapList,
  SourceConversionTable,
} from "@/components/AnalyticsDashboard";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
      <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded" />
    </div>
  );
}

/** Inline empty state shown inside a SectionCard when that section has no data. */
function SectionEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10 text-gray-200 dark:text-gray-700"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect x="4" y="25" width="7" height="10" rx="2" fill="currentColor" opacity="0.35" />
        <rect x="14" y="18" width="7" height="17" rx="2" fill="currentColor" opacity="0.45" />
        <rect x="24" y="11" width="7" height="24" rx="2" fill="currentColor" opacity="0.55" />
        <line x1="2" y1="36" x2="38" y2="36" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      </svg>
      <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
      <Link
        href="/pipeline"
        className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        Run the pipeline →
      </Link>
    </div>
  );
}

const TIME_RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
];

function buildCsvRows(data: AnalyticsData): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const row = (...cols: (string | number)[]) => cols.map(escape).join(",");

  const sections: string[] = [];

  // Summary stats
  sections.push("SUMMARY STATS");
  sections.push(row("Metric", "Value"));
  sections.push(row("Jobs Scraped", data.weeklyActivity.jobsScraped));
  sections.push(row("Applications Created", data.weeklyActivity.applicationsCreated));
  sections.push(row("Interviews Scheduled", data.weeklyActivity.interviewsScheduled));
  sections.push(row("Resume Analyses", data.weeklyActivity.analysesCreated));
  sections.push(row("Overdue Follow-Ups", data.weeklyActivity.overdueFollowUps));
  sections.push(row("Avg Match Score (%)", data.weeklyActivity.avgMatchScore));
  sections.push("");

  // Application funnel
  sections.push("APPLICATION FUNNEL");
  sections.push(row("Status", "Label", "Count"));
  data.funnel.forEach((s) => sections.push(row(s.status, s.label, s.count)));
  sections.push("");

  // Match score distribution
  sections.push("MATCH SCORE DISTRIBUTION");
  sections.push(row("Score Bucket", "Count"));
  data.scoreBuckets.forEach((b) => sections.push(row(b.bucket, b.count)));
  sections.push("");

  // Weekly trend
  sections.push("MATCH SCORE TREND (LAST 8 WEEKS)");
  sections.push(row("Week", "Avg Score (%)", "Job Count"));
  data.weeklyTrend.forEach((w) => sections.push(row(w.week, w.avgScore, w.jobCount)));
  sections.push("");

  // Top job titles
  sections.push("TOP JOB TITLES");
  sections.push(row("Title", "Count", "Avg Score (%)"));
  data.topTitles.forEach((t) => sections.push(row(t.name, t.count, t.avgScore)));
  sections.push("");

  // Top companies
  sections.push("TOP COMPANIES");
  sections.push(row("Company", "Count", "Avg Score (%)"));
  data.topCompanies.forEach((c) => sections.push(row(c.name, c.count, c.avgScore)));
  sections.push("");

  // Source conversions
  if (data.sourceConversions.length > 0) {
    sections.push("CONVERSION BY SOURCE");
    sections.push(row("Source", "Total Jobs", "Applied", "Interviews", "Application Rate (%)", "Avg Score (%)"));
    data.sourceConversions.forEach((s) =>
      sections.push(
        row(
          s.source,
          s.totalJobs,
          s.appliedCount,
          s.interviewCount,
          s.totalJobs > 0 ? Math.round((s.appliedCount / s.totalJobs) * 100) : 0,
          s.avgScore,
        ),
      ),
    );
    sections.push("");
  }

  // Resume performance
  if (data.resumePerformance.length > 0) {
    sections.push("RESUME PERFORMANCE");
    sections.push(row("Resume Name", "Analyses", "Avg Score (%)", "Best Score (%)"));
    data.resumePerformance.forEach((r) =>
      sections.push(row(r.name, r.analysisCount, r.avgScore, r.bestScore)),
    );
    sections.push("");
  }

  // Missing keywords
  if (data.topMissingKeywords.length > 0) {
    sections.push("TOP MISSING KEYWORDS");
    sections.push(row("Keyword", "Occurrences"));
    data.topMissingKeywords.forEach((k) => sections.push(row(k.keyword, k.count)));
    sections.push("");
  }

  return sections.join("\n");
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const csv = buildCsvRows(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobtailor-analytics-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d: AnalyticsData) => {
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days]);

  // True global empty: no jobs scraped AND no funnel activity at all
  const isGloballyEmpty =
    !loading &&
    !error &&
    data &&
    data.weeklyActivity.jobsScraped === 0 &&
    data.funnel.every((s) => s.count === 0) &&
    data.scoreBuckets.every((b) => b.count === 0);

  // Per-section empty checks (only evaluated when data exists)
  const funnelEmpty = data ? data.funnel.every((s) => s.count === 0) : true;
  const scoreDistEmpty = data ? data.scoreBuckets.every((b) => b.count === 0) : true;
  const trendEmpty = data ? data.weeklyTrend.every((w) => w.jobCount === 0) : true;
  const topListEmpty = data ? data.topTitles.length === 0 && data.topCompanies.length === 0 : true;
  const resumeEmpty = data ? data.resumePerformance.length === 0 : true;
  const keywordEmpty = data ? data.topMissingKeywords.length === 0 : true;
  const sourceEmpty = data ? data.sourceConversions.length === 0 : true;

  // Low-data tip: jobs exist but fewer than 5
  const showLowDataTip =
    !loading &&
    !error &&
    data &&
    !isGloballyEmpty &&
    data.weeklyActivity.jobsScraped > 0 &&
    data.weeklyActivity.jobsScraped < 5;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Insights from your job search data.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  days === opt.days
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {data && !loading && !error && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <SkeletonChart key={i} />)}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Failed to load analytics</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try refreshing the page</p>
        </div>
      )}

      {/* Global empty state — nothing scraped, no funnel data */}
      {isGloballyEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-200 dark:text-gray-700 mb-5" viewBox="0 0 80 80" fill="none" aria-hidden="true">
            {/* Chart bars */}
            <rect x="8" y="50" width="14" height="20" rx="3" fill="currentColor" opacity="0.3" />
            <rect x="28" y="36" width="14" height="34" rx="3" fill="currentColor" opacity="0.4" />
            <rect x="48" y="22" width="14" height="48" rx="3" fill="currentColor" opacity="0.5" />
            <line x1="4" y1="72" x2="76" y2="72" stroke="currentColor" strokeWidth="2" opacity="0.3" />
            {/* Magnifying glass overlay */}
            <circle cx="58" cy="26" r="12" stroke="currentColor" strokeWidth="2.5" opacity="0.5" />
            <line x1="67" y1="35" x2="76" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
          </svg>
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-lg">No data yet — start by running the pipeline</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 mb-6 max-w-sm">
            Scrape jobs and track applications to unlock insights here.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/pipeline"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Run the Pipeline
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 px-4 py-2.5 rounded-lg text-sm font-medium hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Go to Opportunity Inbox
            </Link>
          </div>
        </div>
      )}

      {/* Dashboard — shown whenever data exists and is not globally empty */}
      {!loading && !error && data && !isGloballyEmpty && (
        <div className="space-y-6">

          {/* Low-data tip banner */}
          {showLowDataTip && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Tip:</span> Run the pipeline daily to get better match scores and more complete analytics.
              </p>
            </div>
          )}

          {/* Highlight cards: Best Resume & Biggest Gaps */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Best Resume
              </p>
              {data.resumePerformance[0] ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-emerald-950 dark:text-emerald-200">
                    {data.resumePerformance[0].name}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-300">
                    Avg score {data.resumePerformance[0].avgScore}% across {data.resumePerformance[0].analysisCount} analyses.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-300">Analyze a resume against jobs to surface the strongest one.</p>
              )}
            </div>

            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Biggest Resume Gaps
              </p>
              {data.topMissingKeywords[0] ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-rose-950 dark:text-rose-200">
                    {data.topMissingKeywords.slice(0, 3).map((gap) => gap.keyword).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-rose-900 dark:text-rose-300">
                    These keywords show up most often in missing-skills analysis.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-rose-900 dark:text-rose-300">No keyword gap data yet.</p>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="Jobs Scraped"
              value={data.weeklyActivity.jobsScraped}
              subtitle={days > 0 ? `new in last ${days} days` : "all time"}
              valueColor="text-indigo-600"
            />
            <StatCard
              label="Applications"
              value={data.weeklyActivity.applicationsCreated}
              subtitle={days > 0 ? `created in last ${days} days` : "all time"}
              valueColor="text-blue-600"
            />
            <StatCard
              label="Interviews"
              value={data.weeklyActivity.interviewsScheduled}
              subtitle={days > 0 ? `moved to interview in last ${days} days` : "all time"}
              valueColor="text-amber-600"
            />
            <StatCard
              label="Analyses"
              value={data.weeklyActivity.analysesCreated}
              subtitle={days > 0 ? `resume checks in last ${days} days` : "all time"}
              valueColor="text-emerald-600"
            />
            <StatCard
              label="Overdue Follow-Ups"
              value={data.weeklyActivity.overdueFollowUps}
              subtitle="needs attention"
              valueColor={data.weeklyActivity.overdueFollowUps > 0 ? "text-rose-600" : "text-gray-700"}
            />
            <StatCard
              label="Avg Match Score"
              value={`${data.weeklyActivity.avgMatchScore}%`}
              subtitle="across all jobs"
              valueColor={
                data.weeklyActivity.avgMatchScore >= 70
                  ? "text-green-600"
                  : data.weeklyActivity.avgMatchScore >= 40
                  ? "text-amber-600"
                  : "text-red-600"
              }
            />
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Application Funnel">
              {funnelEmpty ? (
                <SectionEmptyState message="No applications tracked yet. Apply to jobs to populate this funnel." />
              ) : (
                <FunnelChart stages={data.funnel} sourceConversions={data.sourceConversions} />
              )}
            </SectionCard>

            <SectionCard title="Match Score Distribution">
              {scoreDistEmpty ? (
                <SectionEmptyState message="No match scores yet. Run the pipeline to analyse jobs against your resume." />
              ) : (
                <ScoreDistributionChart buckets={data.scoreBuckets} />
              )}
            </SectionCard>

            <SectionCard title="Match Score Trend (last 8 weeks)">
              {trendEmpty ? (
                <SectionEmptyState message="No weekly trend data yet. Scores will appear after a few pipeline runs." />
              ) : (
                <ScoreTrendChart weeks={data.weeklyTrend} />
              )}
            </SectionCard>

            <SectionCard title="Top Titles & Companies">
              {topListEmpty ? (
                <SectionEmptyState message="No title or company data yet. Scrape more jobs to see patterns." />
              ) : (
                <TopListChart titles={data.topTitles} companies={data.topCompanies} />
              )}
            </SectionCard>

            <SectionCard title="Best Performing Resumes">
              {resumeEmpty ? (
                <SectionEmptyState message="No resume analyses yet. Analyse a resume against a job listing to get started." />
              ) : (
                <ResumePerformanceList resumes={data.resumePerformance} />
              )}
            </SectionCard>

            <SectionCard title="Most Common Missing Keywords">
              {keywordEmpty ? (
                <SectionEmptyState message="No keyword gap data yet. Run a resume analysis to discover missing skills." />
              ) : (
                <KeywordGapList gaps={data.topMissingKeywords} />
              )}
            </SectionCard>
          </div>

          {/* Source conversion table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Conversion by Source
            </p>
            {sourceEmpty ? (
              <SectionEmptyState message="No source conversion data yet. Jobs scraped from multiple sources will appear here." />
            ) : (
              <SourceConversionTable sources={data.sourceConversions} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
