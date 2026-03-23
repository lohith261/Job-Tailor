"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { JobCard } from "@/components/JobCard";
import { FilterBar, type SortBy } from "@/components/FilterBar";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { OnboardingWizard } from "@/components/OnboardingWizard";
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
  note: string;
  pinned: boolean;
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

const CONFIG_BANNER_KEY = "config-banner-dismissed";
const ONBOARDING_DISMISSED_KEY = "onboarding-dismissed";
const PAGE_LIMIT = 20;

export default function OpportunityInbox() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [activeStatus, setActiveStatus] = useState("all");
  const [activeQuickView, setActiveQuickView] = useState<QuickView>("all");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [sources, setSources] = useState<string[]>([]);
  const [showConfigBanner, setShowConfigBanner] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const noteDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters();

  const buildParams = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      if (activeStatus !== "all") params.set("status", activeStatus);
      if (search) params.set("search", search);
      if (source) params.set("source", source);
      const scoreWindow = getScoreWindow(activeQuickView);
      if (scoreWindow.minScore != null) params.set("minScore", String(scoreWindow.minScore));
      if (scoreWindow.maxScore != null) params.set("maxScore", String(scoreWindow.maxScore));
      params.set("sortBy", "matchScore");
      params.set("sortOrder", "desc");
      params.set("page", String(page));
      params.set("limit", String(PAGE_LIMIT));
      return params;
    },
    [activeQuickView, activeStatus, search, source]
  );

  // Initial / filter-change load: replace the job list.
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?${buildParams(1)}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setHasMore(data.hasMore ?? false);
      setTotal(data.total ?? 0);
      setCurrentPage(1);
      setJobCounts(data.counts || {});
      setSources(data.sources || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Check config on mount to show warning banner if titles are not configured
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(CONFIG_BANNER_KEY)) return;
    fetch("/api/config")
      .then((r) => r.ok ? r.json() : null)
      .then((cfg) => {
        if (cfg && (!cfg.titles || cfg.titles.length === 0)) {
          setShowConfigBanner(true);
        }
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // Show onboarding wizard for new users: no config AND no jobs, and not already dismissed
  useEffect(() => {
    if (loading) return;
    if (typeof window !== "undefined" && localStorage.getItem(ONBOARDING_DISMISSED_KEY)) return;
    if (showConfigBanner && (jobCounts.all ?? 0) === 0) {
      setShowOnboarding(true);
    }
  }, [loading, showConfigBanner, jobCounts]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const res = await fetch(`/api/jobs?${buildParams(nextPage)}`);
      const data = await res.json();
      setJobs((prev) => [...prev, ...(data.jobs || [])]);
      setHasMore(data.hasMore ?? false);
      setTotal(data.total ?? total);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error("Failed to load more jobs:", err);
    }
    setLoadingMore(false);
  };

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

  // Client-side filtering for quick-win / stretch views (data already score-filtered server-side).
  const displayedJobs = jobs
    .filter((job) => {
      if (activeQuickView === "quick-wins") {
        return job.priorityInsights?.recommendation === "quick-win";
      }
      if (activeQuickView === "stretch") {
        return job.priorityInsights?.recommendation === "stretch";
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned jobs always float to the top.
      const aPinned = a.pinned ? 1 : 0;
      const bPinned = b.pinned ? 1 : 0;
      if (bPinned !== aPinned) return bPinned - aPinned;

      // Secondary sort by user selection.
      switch (sortBy) {
        case "score":
          return b.matchScore - a.matchScore;
        case "company":
          return (a.company ?? "").localeCompare(b.company ?? "");
        case "title":
          return (a.title ?? "").localeCompare(b.title ?? "");
        case "date":
        default:
          // Newest first; treat missing dates as oldest.
          return (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
      }
    });

  const handleDismissBanner = () => {
    setShowConfigBanner(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(CONFIG_BANNER_KEY, "1");
    }
  };

  const handleOnboardingComplete = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
    setShowOnboarding(false);
  };

  const handleOnboardingDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    }
    setShowOnboarding(false);
  };

  const handleTogglePin = async (id: string) => {
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    const newPinned = !job.pinned;
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, pinned: newPinned } : j)));
    try {
      await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned }),
      });
    } catch (err) {
      console.error("Failed to update pin:", err);
      // Revert on failure
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, pinned: job.pinned } : j)));
    }
  };

  const handleNoteChange = (id: string, note: string) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, note } : j)));
    if (noteDebounceRefs.current[id]) {
      clearTimeout(noteDebounceRefs.current[id]);
    }
    noteDebounceRefs.current[id] = setTimeout(async () => {
      try {
        await fetch(`/api/jobs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        });
      } catch (err) {
        console.error("Failed to save note:", err);
      }
    }, 600);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedJobs.length && displayedJobs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedJobs.map((j) => j.id)));
    }
  };

  const handleBulkTrack = async () => {
    const ids = Array.from(selectedIds);
    await Promise.allSettled(
      ids.map((jobId) =>
        fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, status: "bookmarked" }),
        })
      )
    );
    setSelectedIds(new Set());
    fetchJobs();
  };

  const handleBulkDismiss = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleStatusChange(id, "not_interested");
    }
    setSelectedIds(new Set());
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleStatusChange(id, "archived");
    }
    setSelectedIds(new Set());
  };

  const handleApplyFilter = (filter: import("@/hooks/useSavedFilters").SavedFilter) => {
    setActiveStatus(filter.status);
    setActiveQuickView(filter.quickView as QuickView);
    setSearch(filter.search);
    setSource(filter.source);
    setSortBy(filter.sortBy);
  };

  const handleSaveFilter = (name: string) => {
    return saveFilter(name, {
      status: activeStatus,
      quickView: activeQuickView,
      search,
      source,
      sortBy,
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleOnboardingComplete}
          onDismiss={handleOnboardingDismiss}
        />
      )}
      {showConfigBanner && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Your search isn&apos;t configured yet. Jobs scraped without a config may not match your goals.{" "}
            <Link href="/settings" className="font-semibold underline hover:text-yellow-900">
              Set up Search Config →
            </Link>
          </p>
          <button
            onClick={handleDismissBanner}
            className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 transition-colors"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            Opportunity Inbox
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {jobCounts.all || 0} total jobs found
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <div className="relative group">
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
            <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-10 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              Fetches new job listings from all sources. For AI analysis and cover letter generation, use Run Pipeline.
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterBar
          activeStatus={activeStatus}
          activeQuickView={activeQuickView}
          onStatusChange={setActiveStatus}
          onQuickViewChange={(view) => setActiveQuickView(view)}
          onSearchChange={handleSearchChange}
          onSourceChange={setSource}
          sources={sources}
          jobCounts={jobCounts}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filteredCount={total}
          searchValue={search}
          sourceValue={source}
          savedFilters={savedFilters}
          onSaveFilter={handleSaveFilter}
          onDeleteFilter={deleteFilter}
          onApplyFilter={handleApplyFilter}
          canSaveMore={savedFilters.length < 5}
        />
        {displayedJobs.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex-shrink-0"
          >
            {selectedIds.size === displayedJobs.length && displayedJobs.length > 0
              ? "Deselect all"
              : `Select all (${displayedJobs.length})`}
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-white shadow-md">
          <span className="text-sm font-semibold flex-shrink-0">
            &#x2713; {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkTrack}
            className="rounded-lg bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30 transition-colors"
          >
            Track all
          </button>
          <button
            onClick={handleBulkDismiss}
            className="rounded-lg bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30 transition-colors"
          >
            Dismiss all
          </button>
          <button
            onClick={handleBulkArchive}
            className="rounded-lg bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30 transition-colors"
          >
            Archive all
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded-lg bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {(quickWins.length > 0 || bestBets.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {quickWins.length > 0 && (
            <ShortlistPanel
              title="Quick Wins"
              subtitle="High match score (70+) with low application effort — apply today"
              tooltip="Jobs where your resume scores 70+ AND the application is low-effort (short form, easy apply, etc.)"
              tone="emerald"
              jobs={quickWins}
            />
          )}
          {bestBets.length > 0 && (
            <ShortlistPanel
              title="Best Bets This Week"
              subtitle="Strong upside with manageable effort — worth the extra prep"
              tooltip="Jobs with high potential (strong fit + good role) but require moderate effort — prioritise these after Quick Wins."
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
                : "Click \"Scrape Now\" to fetch fresh job listings from 6 sources, or click \"Run Pipeline\" on the Pipeline page for full AI analysis + cover letter generation."}
            </p>
            {activeStatus === "all" && typeof window !== "undefined" && localStorage.getItem(ONBOARDING_DISMISSED_KEY) && !showOnboarding && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Get started
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onStatusChange={handleStatusChange}
                  pinned={job.pinned}
                  onTogglePin={handleTogglePin}
                  note={job.note}
                  onNoteChange={handleNoteChange}
                  selected={selectedIds.has(job.id)}
                  onToggleSelect={handleToggleSelect}
                />
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium text-gray-700">{displayedJobs.length}</span> of{" "}
                <span className="font-medium text-gray-700">{total}</span> jobs
              </p>
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-60"
                >
                  {loadingMore ? (
                    <>
                      <Spinner className="h-4 w-4 text-gray-500" />
                      Loading...
                    </>
                  ) : (
                    `Load more`
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShortlistPanel({
  title,
  subtitle,
  tooltip,
  tone,
  jobs,
}: {
  title: string;
  subtitle: string;
  tooltip: string;
  tone: "emerald" | "amber";
  jobs: Job[];
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50"
      : "border-amber-200 bg-amber-50";

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{title}</p>
        <div className="relative group">
          <span className="cursor-default text-gray-400 text-xs select-none">ⓘ</span>
          <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-10 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs text-gray-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {tooltip}
          </div>
        </div>
      </div>
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
