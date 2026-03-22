"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import ApplicationModal from "@/components/ApplicationModal";
import ApprovalGateModal from "@/components/ApprovalGateModal";
import JobPickerModal from "@/components/JobPickerModal";
import type { ApplicationData } from "@/types";
import { KANBAN_COLUMNS } from "@/types";
import { formatDateLabel, getFollowUpUrgency } from "@/lib/follow-up";

interface PendingMove {
  appId: string;
  newStatus: string;
}

interface JobChoice {
  id: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [kanbanSearch, setKanbanSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [addingApp, setAddingApp] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const moveDropdownRef = useRef<HTMLDivElement>(null);
  const [moveDropdownOpen, setMoveDropdownOpen] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close move dropdown when clicking outside
  useEffect(() => {
    if (!moveDropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [moveDropdownOpen]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  function handleMove(appId: string, newStatus: string) {
    // Intercept "applied" moves for approval gate
    if (newStatus === "applied") {
      setPendingMove({ appId, newStatus });
      return;
    }
    applyMove(appId, newStatus);
  }

  async function applyMove(appId: string, newStatus: string, appliedAt?: string) {
    const body: Record<string, unknown> = { status: newStatus };
    if (newStatus === "applied") {
      body.confirmedApplied = true;
      body.appliedAt = appliedAt ?? new Date().toISOString().split("T")[0];
    }

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Move failed");
      const updated: ApplicationData = await res.json();
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updated : a))
      );
    } catch {
      showToast("Failed to move application", "error");
    }
  }

  async function handleApprovalConfirm(appliedAt: string) {
    if (!pendingMove) return;
    await applyMove(pendingMove.appId, "applied", appliedAt);
    setPendingMove(null);
  }

  async function handleAddFromInbox(job: JobChoice) {
    setAddingApp(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, status: "bookmarked" }),
      });
      if (res.status === 409) {
        // Already exists — just show a toast
        showToast("Already tracking this job", "error");
        setShowJobPicker(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to create application");
      const newApp: ApplicationData = await res.json();
      setApplications((prev) => [newApp, ...prev]);
      setShowJobPicker(false);
      showToast(`Added "${newApp.job.title}" to Bookmarked`);
    } catch {
      showToast("Failed to add application", "error");
    } finally {
      setAddingApp(false);
    }
  }

  function handleUpdate(updated: ApplicationData) {
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
    setMoveDropdownOpen(false);
  }

  function handleSelectCard(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectMode(false);
    setMoveDropdownOpen(false);
  }

  async function handleBulkMove(targetStatus: string) {
    if (!targetStatus || selectedIds.size === 0) return;
    setBulkLoading(true);
    setMoveDropdownOpen(false);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            targetStatus === "applied"
              ? { status: targetStatus, confirmedApplied: true, appliedAt: new Date().toISOString().split("T")[0] }
              : { status: targetStatus }
          ),
        }).then((r) => {
          if (!r.ok) throw new Error("failed");
          return r.json() as Promise<ApplicationData>;
        })
      )
    );
    const updated: ApplicationData[] = [];
    let failures = 0;
    for (const r of results) {
      if (r.status === "fulfilled") updated.push(r.value);
      else failures++;
    }
    if (updated.length > 0) {
      setApplications((prev) =>
        prev.map((a) => {
          const u = updated.find((u) => u.id === a.id);
          return u ?? a;
        })
      );
    }
    setBulkLoading(false);
    clearSelection();
    if (failures > 0) {
      showToast(`${failures} application(s) failed to move`, "error");
    } else {
      const label = KANBAN_COLUMNS.find((c) => c.status === targetStatus)?.label ?? targetStatus;
      showToast(`Moved ${updated.length} application(s) to ${label}`);
    }
  }

  async function handleBulkArchive() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "not_interested" }),
        }).then((r) => {
          if (!r.ok) throw new Error("failed");
          return r.json() as Promise<ApplicationData>;
        })
      )
    );
    const updated: ApplicationData[] = [];
    let failures = 0;
    for (const r of results) {
      if (r.status === "fulfilled") updated.push(r.value);
      else failures++;
    }
    if (updated.length > 0) {
      setApplications((prev) =>
        prev.map((a) => {
          const u = updated.find((u) => u.id === a.id);
          return u ?? a;
        })
      );
    }
    setBulkLoading(false);
    clearSelection();
    if (failures > 0) {
      showToast(`${failures} application(s) failed to archive`, "error");
    } else {
      showToast(`Archived ${updated.length} application(s)`);
    }
  }

  const filteredApplications = kanbanSearch.trim()
    ? applications.filter(
        (a) =>
          a.job.title.toLowerCase().includes(kanbanSearch.toLowerCase()) ||
          a.job.company.toLowerCase().includes(kanbanSearch.toLowerCase())
      )
    : applications;

  const selectedApp = applications.find((a) => a.id === selectedAppId) ?? null;
  const existingJobIds = applications.map((a) => a.jobId);
  const attentionApps = applications
    .filter((app) => {
      const urgency = getFollowUpUrgency(app.followUpDate);
      return urgency === "overdue" || urgency === "soon";
    })
    .sort((a, b) => {
      const aDate = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
      const bDate = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
      return aDate - bDate;
    });

  const counts = KANBAN_COLUMNS.reduce<Record<string, number>>((acc, col) => {
    acc[col.status] = applications.filter((a) => a.status === col.status).length;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 flex flex-col min-h-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Track your job applications through every stage of the process.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          <div className="relative w-64">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search applications…"
              value={kanbanSearch}
              onChange={(e) => setKanbanSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm border ${
              selectMode
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-600"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selectMode ? "Selecting…" : "Select"}
          </button>
          <button
            onClick={() => setShowJobPicker(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add from Inbox
          </button>
        </div>
      </div>

      {/* Stage summary badges */}
      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {KANBAN_COLUMNS.map(({ status, label, color }) => {
            const count = counts[status] ?? 0;
            if (count === 0) return null;
            const badgeColors: Record<string, string> = {
              indigo: "bg-indigo-100 text-indigo-700",
              blue: "bg-blue-100 text-blue-700",
              amber: "bg-amber-100 text-amber-700",
              green: "bg-green-100 text-green-700",
              rose: "bg-rose-100 text-rose-700",
              slate: "bg-slate-100 text-slate-600",
            };
            return (
              <span key={status} className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeColors[color]}`}>
                {count} {label}
              </span>
            );
          })}
        </div>
      )}

      {attentionApps.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-300">Needs attention</h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                {attentionApps.length} application{attentionApps.length === 1 ? "" : "s"} need a follow-up soon.
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {attentionApps.slice(0, 6).map((app) => {
              const urgency = getFollowUpUrgency(app.followUpDate);
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className="rounded-lg border border-white/70 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-3 text-left shadow-sm hover:border-amber-300 dark:hover:border-amber-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{app.job.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        urgency === "overdue"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {urgency === "overdue" ? "Overdue" : "Soon"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{app.job.company}</p>
                  {app.followUpDate && (
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      Follow up by {formatDateLabel(app.followUpDate)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-20">
          <svg className="animate-spin w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">No applications yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">
            Start tracking jobs from your Opportunity Inbox
          </p>
          <button
            onClick={() => setShowJobPicker(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add First Application
          </button>
        </div>
      ) : (
        <KanbanBoard
          applications={filteredApplications}
          onMove={handleMove}
          onCardClick={(id) => setSelectedAppId(id)}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onSelect={handleSelectCard}
        />
      )}

      {/* Application detail modal */}
      {selectedApp && (
        <ApplicationModal
          application={selectedApp}
          onClose={() => setSelectedAppId(null)}
          onUpdate={handleUpdate}
          onRequestStatusChange={(appId, newStatus) => {
            setSelectedAppId(null);
            handleMove(appId, newStatus);
          }}
        />
      )}

      {/* Approval gate */}
      {pendingMove && (() => {
        const app = applications.find((a) => a.id === pendingMove.appId);
        if (!app) return null;
        return (
          <ApprovalGateModal
            jobTitle={app.job.title}
            company={app.job.company}
            onConfirm={handleApprovalConfirm}
            onCancel={() => setPendingMove(null)}
          />
        );
      })()}

      {/* Job picker modal */}
      {showJobPicker && (
        <JobPickerModal
          onSelect={handleAddFromInbox}
          onClose={() => setShowJobPicker(false)}
          analyzing={addingApp}
          excludeJobIds={existingJobIds}
        />
      )}

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl">
          {/* Count */}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
            {selectedIds.size} selected
          </span>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Move to dropdown */}
          <div className="relative" ref={moveDropdownRef}>
            <button
              disabled={bulkLoading}
              onClick={() => setMoveDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Move to
              <svg className={`w-3.5 h-3.5 transition-transform ${moveDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {moveDropdownOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                {KANBAN_COLUMNS.map(({ status, label }) => (
                  <button
                    key={status}
                    onClick={() => handleBulkMove(status)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Archive all */}
          <button
            disabled={bulkLoading}
            onClick={handleBulkArchive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:opacity-50"
          >
            {bulkLoading ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
              </svg>
            )}
            Archive all
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

          {/* Clear selection */}
          <button
            disabled={bulkLoading}
            onClick={clearSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
