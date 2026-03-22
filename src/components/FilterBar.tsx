"use client";

import { useState, useRef, useEffect } from "react";
import type { SavedFilter } from "@/hooks/useSavedFilters";

type QuickView = "all" | "strong-fit" | "high-match" | "needs-review" | "quick-wins" | "stretch";
export type SortBy = "date" | "score" | "company" | "title";

interface FilterBarProps {
  activeStatus: string;
  activeQuickView: QuickView;
  onStatusChange: (status: string) => void;
  onQuickViewChange: (view: QuickView) => void;
  onSearchChange: (search: string) => void;
  onSourceChange: (source: string) => void;
  sources: string[];
  jobCounts: Record<string, number>;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  filteredCount?: number;
  searchValue?: string;
  sourceValue?: string;
  // Saved filters
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string) => { ok: boolean; reason?: string };
  onDeleteFilter?: (id: string) => void;
  onApplyFilter?: (filter: SavedFilter) => void;
  canSaveMore?: boolean;
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
  { key: "quick-wins", label: "Quick Wins", description: "High fit and low effort" },
  { key: "stretch", label: "Stretch", description: "Worth tailoring before applying" },
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
  sortBy,
  onSortChange,
  filteredCount,
  searchValue: searchValueProp,
  sourceValue: sourceValueProp,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onApplyFilter,
  canSaveMore = true,
}: FilterBarProps) {
  const [searchValue, setSearchValue] = useState(searchValueProp ?? "");

  // Sync local state when parent drives the value (e.g. applying a saved filter)
  useEffect(() => {
    if (searchValueProp !== undefined) {
      setSearchValue(searchValueProp);
    }
  }, [searchValueProp]);
  const [savingMode, setSavingMode] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saveError, setSaveError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the name input when save mode opens
  useEffect(() => {
    if (savingMode) {
      nameInputRef.current?.focus();
    }
  }, [savingMode]);

  const handleOpenSave = () => {
    setSaveError("");
    setDraftName("");
    setSavingMode(true);
  };

  const handleCancelSave = () => {
    setSavingMode(false);
    setSaveError("");
    setDraftName("");
  };

  const handleConfirmSave = () => {
    if (!onSaveFilter) return;
    const result = onSaveFilter(draftName);
    if (result.ok) {
      setSavingMode(false);
      setDraftName("");
      setSaveError("");
    } else {
      setSaveError(result.reason ?? "Could not save.");
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirmSave();
    if (e.key === "Escape") handleCancelSave();
  };

  return (
    <div className="space-y-3 w-full">
      {/* Row 1: Status tabs + filtered count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                }`}
              >
                {s.label}
                <span
                  className={`text-xs ${isActive ? "text-indigo-500 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {filteredCount != null && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
            {filteredCount} {filteredCount === 1 ? "job" : "jobs"} found
          </span>
        )}
      </div>

      {/* Row 2: Quick view chips */}
      <div className="flex flex-wrap items-center gap-2">
        {quickViews.map((view) => {
          const isActive = activeQuickView === view.key;
          return (
            <button
              key={view.key}
              onClick={() => onQuickViewChange(view.key)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              title={view.description}
            >
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Row 3: Search + source + sort + save button */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title, company, or location..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              onSearchChange(e.target.value);
            }}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          />
        </div>

        <select
          value={sourceValueProp ?? ""}
          onChange={(e) => onSourceChange(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All Sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          aria-label="Sort jobs by"
        >
          <option value="date">Sort: Date</option>
          <option value="score">Sort: Score</option>
          <option value="company">Sort: Company</option>
          <option value="title">Sort: Title</option>
        </select>

        {/* Save filters button / inline input */}
        {onSaveFilter && (
          <>
            {!savingMode ? (
              <button
                onClick={handleOpenSave}
                disabled={!canSaveMore}
                title={canSaveMore ? "Save current filters" : "Maximum saved filters reached (5)"}
                aria-label="Save current filters"
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  canSaveMore
                    ? "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20"
                    : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                }`}
              >
                <BookmarkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Save filters</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => {
                    setDraftName(e.target.value);
                    if (saveError) setSaveError("");
                  }}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Filter name…"
                  className={`w-36 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 ${
                    saveError
                      ? "border-red-400 focus:border-red-400"
                      : "border-indigo-300 focus:border-indigo-400 dark:border-indigo-600"
                  } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200`}
                  aria-label="Saved filter name"
                />
                <button
                  onClick={handleConfirmSave}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  aria-label="Confirm save"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelSave}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Cancel save"
                >
                  <XSmallIcon className="h-4 w-4" />
                </button>
                {saveError && (
                  <span className="text-xs text-red-500">{saveError}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Row 4: Saved filter chips (only when there are saved filters) */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Saved filters">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-0.5">Saved:</span>
          {savedFilters.map((filter) => (
            <SavedFilterChip
              key={filter.id}
              filter={filter}
              onApply={onApplyFilter}
              onDelete={onDeleteFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedFilterChip({
  filter,
  onApply,
  onDelete,
}: {
  filter: SavedFilter;
  onApply?: (filter: SavedFilter) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <span
      role="listitem"
      className="inline-flex items-center gap-0.5 rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
    >
      <button
        onClick={() => onApply?.(filter)}
        className="pl-2.5 pr-1 py-1 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors truncate max-w-[140px]"
        title={`Apply: ${filter.name}`}
      >
        {filter.name}
      </button>
      {onDelete && (
        <button
          onClick={() => onDelete(filter.id)}
          className="pr-1.5 py-1 text-indigo-400 dark:text-indigo-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label={`Delete saved filter "${filter.name}"`}
          title="Delete"
        >
          <XSmallIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
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

function XSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
