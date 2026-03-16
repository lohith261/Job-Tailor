"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [addingApp, setAddingApp] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    <div className="p-6 flex flex-col min-h-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Track your job applications through every stage of the process.
          </p>
        </div>
        <button
          onClick={() => setShowJobPicker(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add from Inbox
        </button>
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
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-amber-900">Needs attention</h2>
              <p className="mt-1 text-sm text-amber-800">
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
                  className="rounded-lg border border-white/70 bg-white px-3 py-3 text-left shadow-sm hover:border-amber-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{app.job.title}</p>
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
                  <p className="mt-1 truncate text-xs text-gray-500">{app.job.company}</p>
                  {app.followUpDate && (
                    <p className="mt-2 text-xs text-gray-600">
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
          <p className="text-gray-600 font-medium text-lg">No applications yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">
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
          applications={applications}
          onMove={handleMove}
          onCardClick={(id) => setSelectedAppId(id)}
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
    </div>
  );
}
