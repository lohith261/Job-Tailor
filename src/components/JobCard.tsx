"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "./ScoreBadge";
import { JobDetail } from "./JobDetail";
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

interface JobCardProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
}

export function JobCard({ job, onStatusChange }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [trackError, setTrackError] = useState(false);
  const router = useRouter();

  async function handleTrack(e: React.MouseEvent) {
    e.stopPropagation();
    if (tracked) {
      router.push("/applications");
      return;
    }
    setTracking(true);
    setTrackError(false);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, status: "bookmarked" }),
      });
      if (res.status === 409) {
        // Already tracked — navigate to board
        router.push("/applications");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTracked(true);
    } catch (err) {
      console.error("[JobCard] track error:", err);
      setTrackError(true);
      // Reset error indicator after 3 seconds
      setTimeout(() => setTrackError(false), 3000);
    } finally {
      setTracking(false);
    }
  }

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const cur = currency || "USD";
    const fmt = (n: number) => {
      if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
      return n.toString();
    };
    if (min && max) return `${cur} ${fmt(min)} - ${fmt(max)}`;
    if (min) return `${cur} ${fmt(min)}+`;
    return `Up to ${cur} ${fmt(max!)}`;
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Recently";
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const locationTypeClass =
    job.locationType === "remote"
      ? "tag-remote"
      : job.locationType === "hybrid"
        ? "tag-hybrid"
        : "tag-onsite";

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="group rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-md">
      <div
        className="cursor-pointer p-5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ScoreBadge score={job.matchScore} />
              <span className="tag text-[10px] uppercase tracking-wide">{job.source}</span>
              {job.status === "new" && (
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{job.company}</p>
          </div>
          <ChevronIcon
            className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {job.location && (
            <span className="flex items-center gap-1 text-gray-500">
              <MapPinIcon className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          {job.locationType && (
            <span className={`tag ${locationTypeClass}`}>{job.locationType}</span>
          )}
          {salary && (
            <span className="flex items-center gap-1 text-gray-500">
              <DollarIcon className="h-3.5 w-3.5" />
              {salary}
            </span>
          )}
          <span className="ml-auto text-gray-400">{timeAgo(job.postedAt)}</span>
        </div>

        {job.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {job.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {job.tags.length > 5 && (
              <span className="tag">+{job.tags.length - 5}</span>
            )}
          </div>
        )}

        {job.matchDetails && (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Why this matched
            </p>
            <div className="mt-2 space-y-1.5">
              {job.matchDetails.breakdown
                .filter((item) => item.score !== 0)
                .slice(0, 2)
                .map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-700">{item.label}</p>
                      <p className="text-gray-500 line-clamp-2">{item.reason}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        item.score > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.score > 0 ? "+" : ""}
                      {item.score}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {job.priorityInsights && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <div>
              <p className="font-semibold text-slate-700">Application effort</p>
              <p className="mt-0.5 text-slate-500">{job.priorityInsights.reason}</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
              {job.priorityInsights.effortLabel}
            </span>
          </div>
        )}
      </div>

      {!expanded && (
        <div className="flex border-t border-gray-100 divide-x divide-gray-100">
          <QuickAction
            label={job.status === "saved" ? "Saved" : "Save"}
            active={job.status === "saved"}
            onClick={() => onStatusChange(job.id, job.status === "saved" ? "new" : "saved")}
          />
          <button
            onClick={handleTrack}
            disabled={tracking}
            className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              tracked
                ? "text-green-600 bg-green-50"
                : trackError
                ? "text-red-500 bg-red-50"
                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            <BookmarkIcon className="h-3.5 w-3.5" />
            {tracked ? "Tracked ✓" : tracking ? "…" : trackError ? "Failed" : "Track"}
          </button>
          <QuickAction
            label="Dismiss"
            onClick={() => onStatusChange(job.id, "dismissed")}
          />
          <QuickAction
            label="Archive"
            onClick={() => onStatusChange(job.id, "archived")}
          />
        </div>
      )}

      {expanded && (
        <JobDetail job={job} onStatusChange={onStatusChange} />
      )}
    </div>
  );
}

function QuickAction({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex-1 py-2 text-xs font-medium transition-colors ${
        active
          ? "text-indigo-600 bg-indigo-50"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
  );
}
