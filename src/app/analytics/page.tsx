"use client";

import { useState, useEffect } from "react";
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
} from "@/components/AnalyticsDashboard";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-32 bg-gray-100 rounded" />
    </div>
  );
}

const TIME_RANGE_OPTIONS: { label: string; days: number }[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);

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

  const isEmpty =
    !loading &&
    !error &&
    data &&
    data.funnel.every((s) => s.count === 0) &&
    data.scoreBuckets.every((b) => b.count === 0);

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">Insights from your job search data.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                days === opt.days
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
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
          <p className="text-gray-600 font-medium">Failed to load analytics</p>
          <p className="text-gray-400 text-sm mt-1">Try refreshing the page</p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 font-medium text-lg">No data yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">
            Add jobs from your Opportunity Inbox and start tracking applications to see insights here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Go to Opportunity Inbox
          </Link>
        </div>
      )}

      {/* Dashboard */}
      {!loading && !error && data && !isEmpty && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Best Resume
              </p>
              {data.resumePerformance[0] ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-emerald-950">
                    {data.resumePerformance[0].name}
                  </p>
                  <p className="mt-1 text-sm text-emerald-900">
                    Avg score {data.resumePerformance[0].avgScore}% across {data.resumePerformance[0].analysisCount} analyses.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-emerald-900">Analyze a resume against jobs to surface the strongest one.</p>
              )}
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Biggest Resume Gaps
              </p>
              {data.topMissingKeywords[0] ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-rose-950">
                    {data.topMissingKeywords.slice(0, 3).map((gap) => gap.keyword).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-rose-900">
                    These keywords show up most often in missing-skills analysis.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-rose-900">No keyword gap data yet.</p>
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
              <FunnelChart stages={data.funnel} />
            </SectionCard>

            <SectionCard title="Match Score Distribution">
              <ScoreDistributionChart buckets={data.scoreBuckets} />
            </SectionCard>

            <SectionCard title="Match Score Trend (last 8 weeks)">
              <ScoreTrendChart weeks={data.weeklyTrend} />
            </SectionCard>

            <SectionCard title="Top Titles & Companies">
              <TopListChart titles={data.topTitles} companies={data.topCompanies} />
            </SectionCard>

            <SectionCard title="Best Performing Resumes">
              <ResumePerformanceList resumes={data.resumePerformance} />
            </SectionCard>

            <SectionCard title="Most Common Missing Keywords">
              <KeywordGapList gaps={data.topMissingKeywords} />
            </SectionCard>
          </div>

          {/* Source conversion table */}
          {data.sourceConversions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Conversion by Source
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Source</th>
                      <th className="text-right pb-2 font-medium">Jobs</th>
                      <th className="text-right pb-2 font-medium">Applied</th>
                      <th className="text-right pb-2 font-medium">Interviews</th>
                      <th className="text-right pb-2 font-medium">Rate</th>
                      <th className="text-right pb-2 font-medium">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.sourceConversions.map((s) => (
                      <tr key={s.source}>
                        <td className="py-2 font-medium text-gray-800 capitalize">{s.source}</td>
                        <td className="py-2 text-right text-gray-600">{s.totalJobs}</td>
                        <td className="py-2 text-right text-gray-600">{s.appliedCount}</td>
                        <td className="py-2 text-right text-gray-600">{s.interviewCount}</td>
                        <td className="py-2 text-right text-gray-600">
                          {s.totalJobs > 0
                            ? `${Math.round((s.appliedCount / s.totalJobs) * 100)}%`
                            : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              s.avgScore >= 70
                                ? "bg-green-100 text-green-700"
                                : s.avgScore >= 40
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {s.avgScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
