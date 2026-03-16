"use client";

import { useState, useCallback } from "react";
import type { ApplicationData, TimelineEvent } from "@/types";
import { KANBAN_COLUMNS } from "@/types";
import TimelineEntry from "./TimelineEntry";
import { formatDateLabel, getFollowUpUrgency } from "@/lib/follow-up";

interface Props {
  application: ApplicationData;
  onClose: () => void;
  onUpdate: (updated: ApplicationData) => void;
  onRequestStatusChange: (appId: string, newStatus: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

const STATUS_BADGE: Record<string, string> = {
  bookmarked: "bg-indigo-100 text-indigo-700",
  applied: "bg-blue-100 text-blue-700",
  interview: "bg-amber-100 text-amber-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-slate-100 text-slate-600",
};

export default function ApplicationModal({
  application,
  onClose,
  onUpdate,
  onRequestStatusChange,
}: Props) {
  const [notes, setNotes] = useState(application.notes);
  const [recruiterName, setRecruiterName] = useState(application.recruiterName);
  const [recruiterEmail, setRecruiterEmail] = useState(application.recruiterEmail);
  const [recruiterLinkedIn, setRecruiterLinkedIn] = useState(application.recruiterLinkedIn);
  const [followUpDate, setFollowUpDate] = useState(
    application.followUpDate ? application.followUpDate.split("T")[0] : ""
  );
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [patchError, setPatchError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(
    [...application.timeline].reverse()
  );

  const patchField = useCallback(
    async (data: Record<string, unknown>) => {
      setPatchError(null);
      try {
        const res = await fetch(`/api/applications/${application.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updated: ApplicationData = await res.json();
          onUpdate(updated);
          setTimeline([...updated.timeline].reverse());
        } else {
          const body = await res.json().catch(() => ({}));
          const msg = body.error ?? `Save failed (${res.status})`;
          setPatchError(msg);
          console.error("[ApplicationModal] patch error:", msg);
          setTimeout(() => setPatchError(null), 4000);
        }
      } catch (err) {
        console.error("[ApplicationModal] patch network error:", err);
        setPatchError("Network error — changes may not have saved.");
        setTimeout(() => setPatchError(null), 4000);
      }
    },
    [application.id, onUpdate]
  );

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/applications/${application.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newNote.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeline([...data.timeline].reverse());
        setNewNote("");
        setAddingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  }

  const { job } = application;
  const followUpUrgency = getFollowUpUrgency(followUpDate || null);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Save-error banner */}
        {patchError && (
          <div className="sticky top-0 z-20 bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {patchError}
          </div>
        )}
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[application.status] ?? ""}`}>
                {STATUS_LABELS[application.status] ?? application.status}
              </span>
            </div>
            <h2 className="font-bold text-gray-900 truncate">{job.title}</h2>
            <p className="text-sm text-gray-500">{job.company}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 border border-blue-200 px-2 py-1 rounded-lg transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Job
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Status mover */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Stage
            </label>
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.map(({ status, label }) => (
                <button
                  key={status}
                  onClick={() =>
                    status !== application.status &&
                    onRequestStatusChange(application.id, status)
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    status === application.status
                      ? `${STATUS_BADGE[status]} border-transparent`
                      : "text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== application.notes && patchField({ notes })}
              placeholder="Add notes about this application…"
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Recruiter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Recruiter Contact
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                onBlur={() =>
                  recruiterName !== application.recruiterName &&
                  patchField({ recruiterName })
                }
                placeholder="Name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                onBlur={() =>
                  recruiterEmail !== application.recruiterEmail &&
                  patchField({ recruiterEmail })
                }
                placeholder="Email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="url"
                value={recruiterLinkedIn}
                onChange={(e) => setRecruiterLinkedIn(e.target.value)}
                onBlur={() =>
                  recruiterLinkedIn !== application.recruiterLinkedIn &&
                  patchField({ recruiterLinkedIn })
                }
                placeholder="LinkedIn URL"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Follow-up Date
            </label>
            <div className="space-y-2">
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                onBlur={() => {
                  const newDate = followUpDate || null;
                  const oldDate = application.followUpDate
                    ? application.followUpDate.split("T")[0]
                    : "";
                  if (followUpDate !== oldDate) {
                    patchField({ followUpDate: newDate });
                  }
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {followUpDate && (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      followUpUrgency === "overdue"
                        ? "bg-red-100 text-red-700"
                        : followUpUrgency === "soon"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {followUpUrgency === "overdue"
                      ? "Overdue"
                      : followUpUrgency === "soon"
                      ? "Coming up"
                      : "Scheduled"}
                  </span>
                  <span className="text-gray-500">
                    Follow up on {formatDateLabel(followUpDate)}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {[3, 5, 7].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      const base = application.appliedAt
                        ? new Date(application.appliedAt)
                        : new Date();
                      const next = new Date(base);
                      next.setDate(next.getDate() + days);
                      const iso = next.toISOString().slice(0, 10);
                      setFollowUpDate(iso);
                      patchField({ followUpDate: iso });
                    }}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    +{days} days
                  </button>
                ))}
                {followUpDate && (
                  <button
                    onClick={() => {
                      setFollowUpDate("");
                      patchField({ followUpDate: null });
                    }}
                    className="rounded-full border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Activity ({timeline.length})
              </label>
              <button
                onClick={() => setAddingNote((v) => !v)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add note
              </button>
            </div>

            {addingNote && (
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="Write a note…"
                  autoFocus
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !newNote.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>
            )}

            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No activity yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {timeline.map((event) => (
                  <TimelineEntry key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
