"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScraperStatusResult } from "@/app/api/scrapers/status/route";

interface StatusResponse {
  sources: ScraperStatusResult[];
  checkedAt: string;
}

function StatusBadge({ status }: { status: ScraperStatusResult["status"] }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        Online
      </span>
    );
  }
  if (status === "disabled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Error
    </span>
  );
}

function LatencyBar({ ms, max = 3000 }: { ms?: number; max?: number }) {
  if (ms === undefined) return null;
  const pct = Math.min((ms / max) * 100, 100);
  const color = ms < 800 ? "bg-green-400" : ms < 2000 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums">{ms} ms</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="mb-4 h-3 w-full rounded bg-gray-100" />
      <div className="h-2 w-20 rounded bg-gray-100" />
    </div>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scrapers/status");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const onlineCount = data?.sources.filter((s) => s.status === "ok").length ?? 0;
  const totalCount = data?.sources.length ?? 0;
  const checkedAt = data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : null;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Source Status</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live health check of all job scraper APIs.
          </p>
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      {data && !loading && (
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                onlineCount === totalCount ? "bg-green-500" : onlineCount > 0 ? "bg-amber-400" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {onlineCount} / {totalCount} sources online
            </span>
          </div>
          {checkedAt && (
            <span className="ml-auto text-xs text-gray-400">Last checked {checkedAt}</span>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to run health check: {error}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.sources.map((source) => (
              <div
                key={source.name}
                className={`rounded-xl border bg-white p-5 transition ${
                  source.status === "ok"
                    ? "border-gray-200"
                    : source.status === "disabled"
                    ? "border-gray-200 opacity-70"
                    : "border-red-200"
                }`}
              >
                {/* Top row */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{source.label}</h3>
                    {source.requiresKey && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <KeyIcon className="h-3 w-3" />
                        API key required
                      </div>
                    )}
                  </div>
                  <StatusBadge status={source.status} />
                </div>

                {/* Description */}
                <p className="mb-3 text-xs text-gray-500 leading-relaxed">{source.description}</p>

                {/* Latency / message */}
                {source.status === "ok" && source.latencyMs !== undefined ? (
                  <LatencyBar ms={source.latencyMs} />
                ) : source.status === "error" ? (
                  <p className="text-xs text-red-600 truncate" title={source.message}>
                    {source.message}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed">{source.message}</p>
                )}
              </div>
            ))}
      </div>

      {/* Footer note */}
      {!loading && (
        <p className="mt-6 text-xs text-gray-400">
          Health checks send a minimal request to each API endpoint. Results reflect current
          network reachability from the server.
        </p>
      )}
    </div>
  );
}
