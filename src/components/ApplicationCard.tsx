"use client";

import type { ApplicationData } from "@/types";
import { ScoreBadge } from "./ScoreBadge";
import { formatDateLabel, getFollowUpUrgency } from "@/lib/follow-up";

interface Props {
  application: ApplicationData;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

function formatSalary(min?: number | null, max?: number | null, currency?: string | null) {
  if (!min && !max) return null;
  const cur = currency === "USD" ? "$" : (currency ?? "");
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  if (min && max) return `${cur}${fmt(min)}–${cur}${fmt(max)}`;
  if (min) return `${cur}${fmt(min)}+`;
  return `Up to ${cur}${fmt(max!)}`;
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ApplicationCard({ application, onClick, onDragStart, selectMode = false, selected = false, onSelect }: Props) {
  const { job } = application;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const urgency = getFollowUpUrgency(application.followUpDate);
  const urgencyBadge =
    urgency === "overdue"
      ? { label: "Overdue", className: "bg-red-100 text-red-700" }
      : urgency === "soon"
      ? { label: "Follow up soon", className: "bg-amber-100 text-amber-700" }
      : urgency === "upcoming"
      ? { label: "Upcoming", className: "bg-blue-100 text-blue-700" }
      : null;

  function handleClick(e: React.MouseEvent) {
    if (selectMode) {
      e.stopPropagation();
      onSelect?.(application.id);
    } else {
      onClick();
    }
  }

  return (
    <div
      draggable={!selectMode}
      onDragStart={selectMode ? undefined : (e) => onDragStart(e, application.id)}
      onClick={handleClick}
      className={`relative bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm cursor-pointer hover:shadow-md transition-all select-none active:opacity-75 active:scale-95 ${
        selected
          ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-300 dark:ring-indigo-600"
          : urgency === "overdue"
          ? "border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600"
          : urgency === "soon"
          ? "border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {/* Select mode checkbox */}
      {selectMode && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            selected
              ? "bg-indigo-600 border-indigo-600"
              : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500"
          }`}>
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Drag handle + overdue indicator */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {!selectMode && (
            <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-grab" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 100-4 2 2 0 000 4zM8 14a2 2 0 100-4 2 2 0 000 4zM8 22a2 2 0 100-4 2 2 0 000 4zM16 6a2 2 0 100-4 2 2 0 000 4zM16 14a2 2 0 100-4 2 2 0 000 4zM16 22a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          )}
          <ScoreBadge score={job.matchScore} />
        </div>
        {urgency === "overdue" && !selectMode && (
          <span title="Follow-up overdue" className="text-sm">⚠️</span>
        )}
      </div>

      {/* Job info */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
        {job.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{job.company}</p>

      {/* Meta */}
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        {job.location && (
          <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {job.location}
          </span>
        )}
        {salary && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{salary}</span>
        )}
        {urgencyBadge && application.followUpDate && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${urgencyBadge.className}`}>
            {urgencyBadge.label}
          </span>
        )}
      </div>

      {application.followUpDate && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Follow up {formatDateLabel(application.followUpDate)}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {application.appliedAt
            ? `Applied ${daysAgo(application.appliedAt)}`
            : `Added ${daysAgo(application.createdAt)}`}
        </span>
        {application.notes && (
          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}
