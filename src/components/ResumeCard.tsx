"use client";

import Link from "next/link";
import type { ResumeData } from "@/types";

interface Props {
  resume: ResumeData;
  onTogglePrimary: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const FORMAT_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  txt: "bg-gray-100 text-gray-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ResumeCard({ resume, onTogglePrimary, onDelete, loading }: Props) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-5 transition-all hover:shadow-md ${resume.isPrimary ? "border-blue-400 dark:border-blue-500 ring-1 ring-blue-400 dark:ring-blue-500" : "border-gray-200 dark:border-gray-700"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {resume.isPrimary && (
              <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                Primary
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${FORMAT_COLORS[resume.format] ?? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
              {resume.format}
            </span>
          </div>
          <Link href={`/resumes/${resume.id}`}>
            <h3 className="mt-1.5 font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
              {resume.name}
            </h3>
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{resume.fileName}</p>
        </div>

        {/* Star / Primary toggle */}
        <button
          onClick={() => onTogglePrimary(resume.id, resume.isPrimary)}
          disabled={loading}
          title={resume.isPrimary ? "Remove as primary" : "Set as primary"}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
            resume.isPrimary
              ? "text-yellow-500 hover:text-yellow-600"
              : "text-gray-300 hover:text-yellow-400"
          }`}
        >
          <svg className="w-5 h-5" fill={resume.isPrimary ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {resume.wordCount.toLocaleString()} words
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {resume.analysisCount ?? 0} {resume.analysisCount === 1 ? "analysis" : "analyses"}
        </span>
        <span className="ml-auto text-xs">{formatDate(resume.createdAt)}</span>
      </div>

      {resume.textPreview && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 italic line-clamp-2">{resume.textPreview}</p>
        </div>
      )}

      {resume.jobAnalysis && (
        <div className="mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Selected Job Fit
            </p>
            <span className="rounded-full bg-white dark:bg-gray-700 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {resume.jobAnalysis.matchScore}%
            </span>
          </div>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
            {resume.jobAnalysis.presentKeywordsCount} matched keywords,{" "}
            {resume.jobAnalysis.missingKeywordsCount} still missing.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/resumes/${resume.id}`}
          className="flex-1 text-center text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg px-3 py-1.5 font-medium transition-colors"
        >
          View & Analyze
        </Link>
        <button
          onClick={() => onDelete(resume.id)}
          disabled={loading}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete resume"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
