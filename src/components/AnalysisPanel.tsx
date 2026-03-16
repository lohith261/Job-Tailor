"use client";

import { useState } from "react";
import type { ResumeAnalysisData } from "@/types";

interface Props {
  analysis: ResumeAnalysisData;
  defaultExpanded?: boolean;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-gray-400 leading-none mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function KeywordChip({ label, type }: { label: string; type: "present" | "missing" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        type === "present"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {type === "present" ? "✓" : "✗"} {label}
    </span>
  );
}

export default function AnalysisPanel({ analysis, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const job = analysis.job;
  const scoreLabel =
    analysis.matchScore >= 75 ? "Strong Match" : analysis.matchScore >= 50 ? "Moderate Match" : "Weak Match";
  const scoreBg =
    analysis.matchScore >= 75
      ? "bg-green-50 border-green-200"
      : analysis.matchScore >= 50
      ? "bg-yellow-50 border-yellow-200"
      : "bg-red-50 border-red-200";
  const topMissing = analysis.missingKeywords.slice(0, 5);

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${scoreBg}`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-black/5 transition-colors"
      >
        <ScoreRing score={analysis.matchScore} />

        <div className="flex-1 min-w-0">
          {job && (
            <>
              <p className="font-semibold text-gray-900 truncate">
                {job.title}
              </p>
              <p className="text-sm text-gray-600">
                {job.company}
                {job.location && ` · ${job.location}`}
                {job.locationType && (
                  <span className="ml-1 text-xs bg-white/70 border px-1.5 py-0.5 rounded-full">
                    {job.locationType}
                  </span>
                )}
              </p>
            </>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-gray-500">{scoreLabel}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">
              {analysis.presentKeywords.length} keywords matched,{" "}
              {analysis.missingKeywords.length} missing
            </span>
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 bg-white border-t border-inherit space-y-5">
          {/* Summary */}
          <div className="pt-4">
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {topMissing.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                Highest-priority gaps
              </p>
              <p className="mt-1 text-sm text-red-800">
                Add evidence for {topMissing.join(", ")}
                {analysis.missingKeywords.length > topMissing.length
                  ? ` and ${analysis.missingKeywords.length - topMissing.length} more keywords`
                  : ""}.
              </p>
            </div>
          )}

          {/* Keywords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Present */}
            <div>
              <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Present in your resume ({analysis.presentKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.presentKeywords.length > 0 ? (
                  analysis.presentKeywords.map((kw) => (
                    <KeywordChip key={kw} label={kw} type="present" />
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">None detected</p>
                )}
              </div>
            </div>

            {/* Missing */}
            <div>
              <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Missing from your resume ({analysis.missingKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingKeywords.length > 0 ? (
                  analysis.missingKeywords.map((kw) => (
                    <KeywordChip key={kw} label={kw} type="missing" />
                  ))
                ) : (
                  <p className="text-xs text-green-600 italic font-medium">All keywords covered! 🎉</p>
                )}
              </div>
            </div>
          </div>

          {/* Bullet suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Bullet Point Suggestions ({analysis.suggestions.length})
              </h4>
              <div className="space-y-3">
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-500 block">Before</span>
                        <p className="text-sm text-gray-700 truncate">{s.original}</p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expandedSuggestion === i ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expandedSuggestion === i && (
                      <div className="px-4 py-3 space-y-2 bg-white">
                        <div>
                          <span className="text-xs font-medium text-green-700 block mb-1">After</span>
                          <p className="text-sm text-gray-900 leading-relaxed">{s.improved}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-xs font-medium text-blue-700">Why: </span>
                          <span className="text-xs text-blue-600">{s.reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
