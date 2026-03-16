"use client";

import { useState } from "react";

type QuickView = "all" | "strong-fit" | "high-match" | "needs-review";

interface FilterBarProps {
  activeStatus: string;
  activeQuickView: QuickView;
  onStatusChange: (status: string) => void;
  onQuickViewChange: (view: QuickView) => void;
  onSearchChange: (search: string) => void;
  onSourceChange: (source: string) => void;
  sources: string[];
  jobCounts: Record<string, number>;
}

const statuses = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "archived", label: "Archived" },
];

const quickViews: Array<{ key: QuickView; label: string; description: string }> = [
  { key: "all", label: "All Scores", description: "Everything in your inbox" },
  { key: "strong-fit", label: "Strong Fit", description: "70% and above" },
  { key: "high-match", label: "High Match", description: "85% and above" },
  { key: "needs-review", label: "Needs Review", description: "Below 50%" },
];

export function FilterBar({
  activeStatus,
  activeQuickView,
  onStatusChange,
  onQuickViewChange,
  onSearchChange,
  onSourceChange,
  sources,
  jobCounts,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {statuses.map((s) => {
          const count = jobCounts[s.key] || 0;
          const isActive = activeStatus === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onStatusChange(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {s.label}
              <span
                className={`text-xs ${isActive ? "text-indigo-500" : "text-gray-400"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickViews.map((view) => {
          const isActive = activeQuickView === view.key;
          return (
            <button
              key={view.key}
              onClick={() => onQuickViewChange(view.key)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title={view.description}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title, company, or location..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          onChange={(e) => onSourceChange(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All Sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}
