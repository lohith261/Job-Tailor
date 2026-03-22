"use client";

import type { TimelineEvent } from "@/types";

interface Props {
  event: TimelineEvent;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EventIcon({ type }: { type: TimelineEvent["type"] }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "status_change":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    case "note_added":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case "follow_up_set":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "recruiter_added":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
  }
}

const TYPE_COLORS: Record<TimelineEvent["type"], string> = {
  status_change: "bg-blue-100 text-blue-600",
  note_added: "bg-purple-100 text-purple-600",
  follow_up_set: "bg-amber-100 text-amber-600",
  recruiter_added: "bg-green-100 text-green-600",
  manual: "bg-gray-100 text-gray-600",
};

export default function TimelineEntry({ event }: Props) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${TYPE_COLORS[event.type]}`}>
        <EventIcon type={event.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(event.timestamp)}</p>
      </div>
    </div>
  );
}
