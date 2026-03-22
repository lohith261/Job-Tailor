"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SortBy } from "@/components/FilterBar";

export interface SavedFilter {
  id: string;
  name: string;
  status: string;
  quickView: string;
  search: string;
  source: string;
  sortBy: SortBy;
}

const STORAGE_KEY = "saved-filter-combos";
const MAX_SAVED = 5;

const DEFAULT_PRESETS: SavedFilter[] = [
  {
    id: "preset-high-score",
    name: "High Score Jobs",
    status: "all",
    quickView: "all",
    search: "",
    source: "",
    sortBy: "score",
  },
  {
    id: "preset-recent-applications",
    name: "Recent Applications",
    status: "applied",
    quickView: "all",
    search: "",
    source: "",
    sortBy: "date",
  },
];

function loadFromStorage(): SavedFilter[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedFilter[];
  } catch {
    return null;
  }
}

function writeToStorage(filters: SavedFilter[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  // Keep a ref that is always in sync with the latest state so callbacks
  // can read the current length without stale closures.
  const filtersRef = useRef<SavedFilter[]>([]);

  useEffect(() => {
    const stored = loadFromStorage();
    const initial = stored === null ? DEFAULT_PRESETS : stored;
    if (stored === null) writeToStorage(DEFAULT_PRESETS);
    filtersRef.current = initial;
    setSavedFilters(initial);
  }, []);

  const saveFilter = useCallback(
    (
      name: string,
      filter: Omit<SavedFilter, "id" | "name">
    ): { ok: boolean; reason?: string } => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, reason: "Name cannot be empty." };

      const current = filtersRef.current;
      if (current.length >= MAX_SAVED) {
        return { ok: false, reason: `Maximum of ${MAX_SAVED} saved filters reached.` };
      }

      const next: SavedFilter[] = [
        ...current,
        { id: `filter-${Date.now()}`, name: trimmed, ...filter },
      ];
      filtersRef.current = next;
      writeToStorage(next);
      setSavedFilters(next);
      return { ok: true };
    },
    []
  );

  const deleteFilter = useCallback((id: string) => {
    const next = filtersRef.current.filter((f) => f.id !== id);
    filtersRef.current = next;
    writeToStorage(next);
    setSavedFilters(next);
  }, []);

  return { savedFilters, saveFilter, deleteFilter };
}
