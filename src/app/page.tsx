"use client";

import { useState, useEffect, useCallback } from "react";
import { JobCard } from "@/components/JobCard";
import { FilterBar } from "@/components/FilterBar";
import type { JobMatchDetails, JobPriorityInsights } from "@/types";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  locationType: string | null;
  url: string;
  source: string;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  experienceLevel: string | null;
  tags: string[];
  postedAt: string | null;
  matchScore: number;
  matchDetails?: JobMatchDetails;
  priorityInsights?: JobPriorityInsights;
  status: string;
}

type QuickView = "all" | "strong-fit" | "high-match" | "needs-review" | "quick-wins" | "stretch";

function getScoreWindow(view: QuickView): { minScore?: number; maxScore?: number } {
  switch (view) {
    case "strong-fit":
      return { minScore: 70 };
    case "high-match":
      return { minScore: 85 };
    case "needs-review":
      return { maxScore: 49 };
    default:
      return {};
  }
}

export default function OpportunityInbox() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [activeQuickView, setActiveQuickView] = useState<QuickView>("all");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [sources, setSources] = useState<string[]>([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeStatus !== "all") params.set("status", activeStatus);
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    const scoreWindow = getScoreWindow(activeQuickView);
    if (scoreWindow.minScore != null) params.set("minScore", String(scoreWindow.minScore));
    if (scoreWindow.maxScore != null) params.set("maxScore", String(scoreWindow.maxScore));
    params.set("sortBy", "matchScore");
    params.set("sortOrder", "desc");

    try {
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setJobCounts(data.counts || {});
      setSources(data.sources || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
    setLoading(false);
  }, [activeQuickView, activeStatus, search, source]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, status } : j))
      );
      fetchJobs();
    } catch (err) {
      console.error("Failed to update job:", err);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const res = await fetch("/api/jobs/scrape", { method: "POST" });
      const data = await res.json();
      alert(`Scraping complete! Found ${data.newJobs || 0} new jobs.`);
      fetchJobs();
    } catch (err) {
      console.error("Scrape failed:", err);
      alert("Scraping failed. Check console for details.");
    }
    setScraping(false);
  };

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleSearchChange = (value: string) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => setSearch(value), 300);
    setSearchTimeout(timeout);
  };

  const quickWins = jobs.filter((job) => job.priorityInsights?.recommendation === "quick-win").slice(0, 3);
  const bestBets = jobs
    .filter((job) => job.priorityInsights?.recommendation === "best-bet")
    .slice(0, 3);
  const displayedJobs = jobs.filter((job) => {
    if (activeQuickView === "quick-wins") {
      return job.priorityInsights?.recommendation === "quick-win";
    }
    if (activeQuickView === "stretch") {
      return job.priorityInsights?.recommendation === "stretch";
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Opportunity Inbox
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {jobCounts.all || 0} total jobs found
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {scraping ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Scraping...
              </span>
            ) : (
              "Scrape Now"
            )}
          </button>
        </div>
      </div>

      <FilterBar
        activeStatus={activeStatus}
        activeQuickView={activeQuickView}
        onStatusChange={setActiveStatus}
        onQuickViewChange={(view) => setActiveQuickView(view)}
        onSearchChange={handleSearchChange}
        onSourceChange={setSource}
        sources={sources}
        jobCounts={jobCounts}
      />

      {(quickWins.length > 0 || bestBets.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {quickWins.length > 0 && (
            <ShortlistPanel
              title="Quick Wins"
              subtitle="Strong fit, lower effort"
              tone="emerald"
              jobs={quickWins}
            />
          )}
          {bestBets.length > 0 && (
            <ShortlistPanel
              title="Best Bets This Week"
              subtitle="High upside with manageable effort"
              tone="amber"
              jobs={bestBets}
            />
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-600" />
          </div>
        ) : displayedJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">&#128270;</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No jobs found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {activeStatus !== "all"
                ? "Try a different filter or status."
                : "Click \"Seed Data\" to add sample jobs, or \"Scrape Now\" to fetch real listings."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShortlistPanel({
  title,
  subtitle,
  tone,
  jobs,
}: {
  title: string;
  subtitle: string;
  tone: "emerald" | "amber";
  jobs: Job[];
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      <div className="mt-3 space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-lg bg-white px-3 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{job.title}</p>
                <p className="truncate text-xs text-gray-500">{job.company}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {job.priorityInsights?.effortLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-600">{job.priorityInsights?.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
