"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ServiceHealth, RecentPipelineError, ServiceStatus } from "@/app/api/admin/api-health/route";

type Plan = "monthly" | "annual";

interface PendingUser {
  id: string;
  email: string;
  plan: Plan;
  transactionId: string;
  submittedAt: string;
}

interface ActiveUser {
  id: string;
  email: string;
  plan: Plan;
  activatedAt: string;
  expiresAt: string;
}

interface AdminData {
  pending: PendingUser[];
  active: ActiveUser[];
  totalActive: number;
  totalPending: number;
}

interface ApiHealthData {
  services: ServiceHealth[];
  recentErrors: RecentPipelineError[];
  checkedAt: string;
}

type ToastType = "success" | "error";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Tab = "users" | "api-health";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PlanBadge({ plan }: { plan: Plan }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        plan === "annual"
          ? "bg-green-100 text-green-700"
          : "bg-blue-100 text-blue-700"
      }`}
    >
      {plan === "monthly" ? "Monthly" : "Annual"}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback — silently ignore
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      title="Copy"
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
        </svg>
      )}
    </button>
  );
}

const STATUS_CONFIG: Record<ServiceStatus, { dot: string; badge: string; label: string }> = {
  ok: {
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 ring-1 ring-green-200",
    label: "Operational",
  },
  warning: {
    dot: "bg-amber-400 animate-pulse",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    label: "Warning",
  },
  error: {
    dot: "bg-red-500 animate-pulse",
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    label: "Error",
  },
  unconfigured: {
    dot: "bg-gray-300",
    badge: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
    label: "Not configured",
  },
};

function ServiceCard({ service }: { service: ServiceHealth }) {
  const cfg = STATUS_CONFIG[service.status];
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{service.name}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{service.message}</p>
      {service.detail && (
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
          {service.detail}
        </p>
      )}
      {service.latencyMs != null && (
        <p className="text-xs text-gray-400">{service.latencyMs}ms</p>
      )}
    </div>
  );
}

function overallStatus(services: ServiceHealth[]): { status: ServiceStatus; text: string } {
  if (services.some((s) => s.status === "error")) return { status: "error", text: "Degraded — some services have errors" };
  if (services.some((s) => s.status === "warning")) return { status: "warning", text: "Warning — some services need attention" };
  if (services.every((s) => s.status === "unconfigured")) return { status: "unconfigured", text: "No services configured" };
  return { status: "ok", text: "All systems operational" };
}

function ApiHealthTab({ health, onRefresh, refreshing }: {
  health: ApiHealthData | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  if (!health) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const overall = overallStatus(health.services);
  const overallCfg = STATUS_CONFIG[overall.status];

  return (
    <div className="space-y-8">
      {/* Overall status banner */}
      <div className={`rounded-xl p-4 flex items-center justify-between gap-4 ${
        overall.status === "ok"
          ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
          : overall.status === "error"
          ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          : overall.status === "warning"
          ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
          : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full flex-shrink-0 ${overallCfg.dot}`} />
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{overall.text}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last checked {timeAgo(health.checkedAt)}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Service grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">External Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {health.services.map((svc) => (
            <ServiceCard key={svc.key} service={svc} />
          ))}
        </div>
      </div>

      {/* Recent pipeline errors */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          Recent Pipeline Errors
          {health.recentErrors.length > 0 && (
            <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-0.5">
              {health.recentErrors.length}
            </span>
          )}
        </h2>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
          {health.recentErrors.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-3xl mb-3">✓</p>
              <p className="text-sm font-medium">No pipeline errors in recent runs</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {health.recentErrors.map((run) => (
                <div key={run.runId} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        run.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {run.status}
                      </span>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {run.runId.slice(0, 8)}…
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(run.startedAt)}</span>
                  </div>
                  <ul className="space-y-1">
                    {run.errors.map((err, i) => (
                      <li key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-3 py-1.5 font-mono break-all">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [healthData, setHealthData] = useState<ApiHealthData | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const toastCounter = useRef(0);
  const [now, setNow] = useState(() => new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function addToast(message: string, type: ToastType) {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/admin/pending");
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (!res.ok) return;
      const json = await res.json() as AdminData;
      setData(json);
    } catch {
      // Silently ignore network errors on poll
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async (showLoading = true) => {
    if (showLoading) setHealthLoading(true);
    try {
      const res = await fetch("/api/admin/api-health");
      if (!res.ok) return;
      const json = await res.json() as ApiHealthData;
      setHealthData(json);
    } catch {
      // Silently ignore
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Load health data when tab switches to api-health
  useEffect(() => {
    if (activeTab === "api-health" && !healthData) {
      void fetchHealth(true);
    }
  }, [activeTab, healthData, fetchHealth]);

  // Auto-refresh users every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleActivate(userId: string) {
    setActionInProgress(userId + "-activate");
    try {
      const res = await fetch(`/api/admin/activate/${userId}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        addToast(d?.error ?? "Failed to activate user", "error");
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              pending: prev.pending.filter((u) => u.id !== userId),
              totalPending: Math.max(0, prev.totalPending - 1),
            }
          : prev
      );
      addToast("User activated successfully", "success");
    } catch {
      addToast("Network error. Please try again.", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleReject(userId: string) {
    setActionInProgress(userId + "-reject");
    try {
      const res = await fetch(`/api/admin/reject/${userId}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        addToast(d?.error ?? "Failed to reject user", "error");
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              pending: prev.pending.filter((u) => u.id !== userId),
              totalPending: Math.max(0, prev.totalPending - 1),
            }
          : prev
      );
      addToast("User rejected", "success");
    } catch {
      addToast("Network error. Please try again.", "error");
    } finally {
      setActionInProgress(null);
    }
  }

  // Compute MRR
  function computeMrr() {
    if (!data) return "₹0";
    const monthly = data.active.filter((u) => u.plan === "monthly").length;
    const annual = data.active.filter((u) => u.plan === "annual").length;
    const mrr = monthly * 499 + annual * 333;
    return `₹${mrr.toLocaleString("en-IN")}`;
  }

  // Truncate long emails
  function truncateEmail(email: string): string {
    if (email.length <= 28) return email;
    const [local, domain] = email.split("@");
    if (!domain) return email.slice(0, 25) + "...";
    const localTruncated = local.length > 14 ? local.slice(0, 12) + "…" : local;
    return `${localTruncated}@${domain}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full py-20">
        <svg className="animate-spin h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Access denied</h1>
        <p className="mt-2 text-sm text-gray-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {t.type === "success" ? "✓" : "✗"} {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                JH
              </div>
              <span className="text-sm text-gray-500">Job Tailor</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h1>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <div className="font-mono mt-0.5">
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{data?.totalPending ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Active Pro</p>
            <p className="text-3xl font-bold text-green-600">{data?.totalActive ?? 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">MRR (est.)</p>
            <p className="text-3xl font-bold text-brand-600">{computeMrr()}</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "users"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Users
            {(data?.totalPending ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5">
                {data!.totalPending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("api-health")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "api-health"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            API Health
            {healthData && healthData.services.some((s) => s.status === "error") && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-red-500" />
            )}
            {healthData && !healthData.services.some((s) => s.status === "error") && healthData.services.some((s) => s.status === "warning") && (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "users" && (
          <>
            {/* Section 1: Pending Activations */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                Pending Activations
                {(data?.totalPending ?? 0) > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5">
                    {data!.totalPending}
                  </span>
                )}
              </h2>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {!data?.pending || data.pending.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <p className="text-3xl mb-3">🎉</p>
                    <p className="text-sm font-medium">No pending activations</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">User Email</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Plan</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Transaction ID</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Submitted</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {data.pending.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3.5">
                              <span
                                className="text-gray-800 dark:text-gray-200 font-medium"
                                title={user.email}
                              >
                                {truncateEmail(user.email)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <PlanBadge plan={user.plan} />
                            </td>
                            <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 font-medium">
                              {user.plan === "monthly" ? "₹499" : "₹3,999"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center">
                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">
                                  {user.transactionId}
                                </span>
                                <CopyButton text={user.transactionId} />
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                              {timeAgo(user.submittedAt)}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleActivate(user.id)}
                                  disabled={actionInProgress !== null}
                                  className="flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {actionInProgress === user.id + "-activate" ? (
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                  )}
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleReject(user.id)}
                                  disabled={actionInProgress !== null}
                                  className="flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {actionInProgress === user.id + "-reject" ? (
                                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Recently Activated */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Recently Activated (Pro Users)
              </h2>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                {!data?.active || data.active.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <p className="text-sm">No active Pro users yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Email</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Plan</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Activated</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">Expires</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {data.active.slice(0, 20).map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3.5 text-gray-800 dark:text-gray-200 font-medium" title={user.email}>
                              {truncateEmail(user.email)}
                            </td>
                            <td className="px-4 py-3.5">
                              <PlanBadge plan={user.plan} />
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                              {formatDate(user.activatedAt)}
                            </td>
                            <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                              {formatDate(user.expiresAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "api-health" && (
          <ApiHealthTab
            health={healthData}
            onRefresh={() => fetchHealth(true)}
            refreshing={healthLoading}
          />
        )}
      </div>
    </div>
  );
}
