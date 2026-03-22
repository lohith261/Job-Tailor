"use client";

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

interface JobDetailProps {
  job: Job;
  onStatusChange: (id: string, status: string) => void;
}

export function JobDetail({ job, onStatusChange }: JobDetailProps) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-5 space-y-4">
      {job.priorityInsights && (
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Fit vs Effort</h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{job.priorityInsights.reason}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {job.priorityInsights.recommendation.replace("-", " ")}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {job.priorityInsights.effortLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      {job.matchDetails && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Why This Matched
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {job.matchDetails.breakdown.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.tone === "positive"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : item.tone === "negative"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {item.score > 0 ? "+" : ""}
                    {item.score}/{item.maxScore}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {job.description && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Job Description
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-2">
            {job.description}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        {job.experienceLevel && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Experience: </span>
            <span className="text-gray-600 dark:text-gray-400">{job.experienceLevel}</span>
          </div>
        )}
        {job.locationType && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Work Type: </span>
            <span className="text-gray-600 dark:text-gray-400 capitalize">{job.locationType}</span>
          </div>
        )}
        {(job.salaryMin || job.salaryMax) && (
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Salary: </span>
            <span className="text-gray-600 dark:text-gray-400">
              {job.salaryCurrency || "USD"}{" "}
              {job.salaryMin ? `${(job.salaryMin / 1000).toFixed(0)}k` : "?"} -{" "}
              {job.salaryMax ? `${(job.salaryMax / 1000).toFixed(0)}k` : "?"}
            </span>
          </div>
        )}
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Source: </span>
          <span className="text-gray-600 dark:text-gray-400">{job.source}</span>
        </div>
      </div>

      {job.tags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Skills & Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          View Original
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>

        <button
          onClick={() =>
            onStatusChange(job.id, job.status === "saved" ? "new" : "saved")
          }
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            job.status === "saved"
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-400"
              : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
          }`}
        >
          {job.status === "saved" ? "Saved" : "Save"}
        </button>

        <button
          onClick={() => onStatusChange(job.id, "archived")}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Archive
        </button>

        <button
          onClick={() => onStatusChange(job.id, "dismissed")}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}
