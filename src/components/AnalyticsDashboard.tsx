"use client";

import { useState, useRef, useEffect } from "react";
import { ScoreBadge } from "./ScoreBadge";
import type {
  FunnelStage,
  KeywordGap,
  ResumePerformance,
  ScoreBucket,
  SourceConversion,
  TopEntry,
  WeeklyTrend,
} from "@/types";

// ── Color maps ───────────────────────────────────────────────────────────────

const FUNNEL_COLORS: Record<string, string> = {
  indigo: "#6366f1",
  blue:   "#3b82f6",
  amber:  "#f59e0b",
  green:  "#22c55e",
  slate:  "#94a3b8",
};

const BUCKET_COLORS = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#16a34a"];

// ── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle?: string;
  valueColor?: string;
}

export function StatCard({ label, value, subtitle, valueColor = "text-gray-900" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── DrillDownPanel ────────────────────────────────────────────────────────────

interface DrillDownPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function DrillDownPanel({ title, onClose, children }: DrillDownPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="mt-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-4 animate-in fade-in slide-in-from-top-2 duration-150"
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{title}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close drill-down"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

// ── FunnelChart ───────────────────────────────────────────────────────────────

interface FunnelChartProps {
  stages: FunnelStage[];
  sourceConversions?: SourceConversion[];
}

export function FunnelChart({ stages, sourceConversions = [] }: FunnelChartProps) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const allZero = stages.every((s) => s.count === 0);

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 48 48">
          <rect x="4" y="10" width="40" height="8" rx="3" fill="currentColor" opacity="0.5" />
          <rect x="10" y="22" width="28" height="8" rx="3" fill="currentColor" opacity="0.35" />
          <rect x="16" y="34" width="16" height="8" rx="3" fill="currentColor" opacity="0.2" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">No applications yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Track jobs to see your pipeline funnel here</p>
      </div>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const svgHeight = stages.length * 44 + 8;

  const appliedCount = stages.find((s) => s.status === "applied")?.count ?? 0;
  const interviewCount = stages.find((s) => s.status === "interview")?.count ?? 0;
  const offerCount = stages.find((s) => s.status === "offer")?.count ?? 0;
  const responseRate = appliedCount > 0
    ? Math.round(((interviewCount + offerCount) / appliedCount) * 100)
    : 0;

  function getDrillDownContent(status: string) {
    const stage = stages.find((s) => s.status === status);
    if (!stage) return null;

    if ((status === "applied" || status === "interview") && sourceConversions.length > 0) {
      const field = status === "applied" ? "appliedCount" : "interviewCount";
      const sorted = [...sourceConversions]
        .filter((s) => s[field] > 0)
        .sort((a, b) => b[field] - a[field])
        .slice(0, 5);
      if (sorted.length === 0) {
        return <p className="text-xs text-gray-400 dark:text-gray-500 italic">No source data available</p>;
      }
      const maxVal = Math.max(...sorted.map((s) => s[field]), 1);
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Top sources for <span className="font-medium text-gray-600 dark:text-gray-300">{stage.label}</span></p>
          {sorted.map((s) => (
            <div key={s.source} className="flex items-center gap-2">
              <span className="w-20 text-xs text-gray-700 dark:text-gray-300 capitalize truncate flex-shrink-0">{s.source}</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((s[field] / maxVal) * 100)}%`,
                    backgroundColor: FUNNEL_COLORS[stage.color] ?? "#6366f1",
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-5 text-right flex-shrink-0">{s[field]}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-200">{stage.count}</span> job{stage.count !== 1 ? "s" : ""} in <span className="font-medium">{stage.label}</span>
      </p>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 400 ${svgHeight}`}
        width="100%"
        aria-label="Application funnel chart"
        style={{ cursor: "pointer" }}
      >
        {stages.map((stage, i) => {
          const rowY = i * 44 + 4;
          const barWidth = maxCount > 0 ? Math.max(4, Math.round(280 * (stage.count / maxCount))) : 0;
          const fillColor = FUNNEL_COLORS[stage.color] ?? "#6366f1";
          const isActive = activeStatus === stage.status;

          return (
            <g
              key={stage.status}
              onClick={() => setActiveStatus(isActive ? null : stage.status)}
              style={{ cursor: stage.count > 0 ? "pointer" : "default" }}
              role="button"
              aria-label={`${stage.label}: ${stage.count}`}
            >
              {/* Hover highlight */}
              {isActive && (
                <rect x={0} y={rowY} width={400} height={36} rx={4} fill={fillColor} opacity="0.06" />
              )}
              {/* Label */}
              <text x="85" y={rowY + 20} textAnchor="end" fontSize="12" fill={isActive ? fillColor : "#6b7280"} fontWeight={isActive ? "600" : "400"}>
                {stage.label}
              </text>
              {/* Track */}
              <rect x={90} y={rowY + 4} width={280} height={24} rx={4} fill="#f3f4f6" />
              {/* Fill */}
              {stage.count > 0 && (
                <rect x={90} y={rowY + 4} width={barWidth} height={24} rx={4} fill={fillColor} opacity={isActive ? 1 : 0.85} />
              )}
              {/* Count */}
              <text x={378} y={rowY + 20} textAnchor="end" fontSize="12" fontWeight="600" fill="#374151">
                {stage.count}
              </text>
              {/* Click affordance indicator */}
              {stage.count > 0 && (
                <text x={394} y={rowY + 20} textAnchor="end" fontSize="10" fill="#9ca3af">›</text>
              )}
            </g>
          );
        })}
      </svg>

      {activeStatus && (
        <DrillDownPanel
          title="Breakdown"
          onClose={() => setActiveStatus(null)}
        >
          {getDrillDownContent(activeStatus)}
        </DrillDownPanel>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Response rate: <span className="font-medium text-gray-600">{responseRate}%</span>
        <span className="ml-1">(interviews + offers / applied)</span>
        {stages.some((s) => s.count > 0) && (
          <span className="ml-2 text-gray-300 dark:text-gray-600">· click a bar to explore</span>
        )}
      </p>
    </div>
  );
}

// ── ScoreDistributionChart ────────────────────────────────────────────────────

interface ScoreDistributionChartProps {
  buckets: ScoreBucket[];
}

export function ScoreDistributionChart({ buckets }: ScoreDistributionChartProps) {
  const allZero = buckets.every((b) => b.count === 0);

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="28" width="8" height="12" rx="2" fill="currentColor" opacity="0.2" />
          <rect x="14" y="20" width="8" height="20" rx="2" fill="currentColor" opacity="0.3" />
          <rect x="24" y="12" width="8" height="28" rx="2" fill="currentColor" opacity="0.4" />
          <rect x="34" y="20" width="8" height="20" rx="2" fill="currentColor" opacity="0.3" />
          <line x1="2" y1="41" x2="46" y2="41" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">No match score data yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Run the pipeline to see score distribution</p>
      </div>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <svg viewBox="0 0 300 170" width="100%" aria-label="Match score distribution">
      {buckets.map((bucket, i) => {
        const x = 16 + i * 52;
        const barMaxH = 100;
        const barH = maxCount > 0 ? Math.max(bucket.count > 0 ? 4 : 0, Math.round(barMaxH * (bucket.count / maxCount))) : 0;
        const barY = 130 - barH;
        const color = BUCKET_COLORS[i];
        const cx = x + 18;

        return (
          <g key={bucket.bucket}>
            {/* Bar */}
            <rect x={x} y={barY} width={36} height={barH} rx={4} fill={color} />
            {/* Count above */}
            {bucket.count > 0 && (
              <text x={cx} y={barY - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">
                {bucket.count}
              </text>
            )}
            {/* Bucket label below */}
            <text x={cx} y={150} textAnchor="middle" fontSize="10" fill="#9ca3af">
              {bucket.bucket}
            </text>
          </g>
        );
      })}
      {/* Baseline */}
      <line x1="10" y1="131" x2="290" y2="131" stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  );
}

// ── ScoreTrendChart ───────────────────────────────────────────────────────────

interface ScoreTrendChartProps {
  weeks: WeeklyTrend[];
}

export function ScoreTrendChart({ weeks }: ScoreTrendChartProps) {
  if (weeks.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" viewBox="0 0 48 48" fill="none">
          <polyline points="4,36 16,24 26,28 38,12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          <circle cx="4" cy="36" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="16" cy="24" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="26" cy="28" r="3" fill="currentColor" opacity="0.4" />
          <circle cx="38" cy="12" r="3" fill="currentColor" opacity="0.4" />
          <line x1="2" y1="42" x2="46" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Not enough data for a trend</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Needs 2+ weeks of job activity</p>
      </div>
    );
  }

  const plotX1 = 40, plotX2 = 480, plotY1 = 20, plotY2 = 140;
  const scores = weeks.map((w) => w.avgScore);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const scoreRange = maxScore - minScore || 1;

  const xStep = (plotX2 - plotX1) / (weeks.length - 1);
  const points = weeks.map((w, i) => ({
    x: plotX1 + i * xStep,
    y: plotY2 - ((w.avgScore - minScore) / scoreRange) * (plotY2 - plotY1),
  }));

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `${points[0].x},${plotY2} ${linePoints} ${points[points.length - 1].x},${plotY2}`;

  // Y-axis guide lines at ~4 intervals
  const guides = [0, 25, 50, 75, 100].filter((v) => v >= minScore - 5 && v <= maxScore + 5);

  return (
    <svg viewBox="0 0 500 180" width="100%" aria-label="Match score trend over time">
      {/* Guide lines */}
      {guides.map((g) => {
        const gy = plotY2 - ((g - minScore) / scoreRange) * (plotY2 - plotY1);
        return (
          <g key={g}>
            <line x1={plotX1} y1={gy} x2={plotX2} y2={gy} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
            <text x={plotX1 - 4} y={gy + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{g}</text>
          </g>
        );
      })}

      {/* Area fill */}
      <polygon points={areaPoints} fill="#eef2ff" opacity="0.7" />

      {/* Line */}
      <polyline points={linePoints} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6366f1" />
      ))}

      {/* X-axis labels */}
      {weeks.map((w, i) => {
        const p = points[i];
        // Show short label: "W10" from "2025-W10"
        const shortLabel = w.week.split("-W")[1] ? `W${w.week.split("-W")[1]}` : w.week;
        return (
          <text
            key={i}
            x={p.x}
            y={165}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
            transform={`rotate(-30, ${p.x}, 165)`}
          >
            {shortLabel}
          </text>
        );
      })}

      {/* Baseline */}
      <line x1={plotX1} y1={plotY2 + 1} x2={plotX2} y2={plotY2 + 1} stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  );
}

// ── TopListChart ──────────────────────────────────────────────────────────────

interface TopListChartProps {
  titles: TopEntry[];
  companies: TopEntry[];
}

export function TopListChart({ titles, companies }: TopListChartProps) {
  const [tab, setTab] = useState<"titles" | "companies">("titles");
  const entries = tab === "titles" ? titles : companies;
  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(["titles", "companies"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t === "titles" ? "By Title" : "By Company"}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200 dark:text-gray-700" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="28" width="8" height="8" rx="2" fill="currentColor" opacity="0.3" />
            <rect x="16" y="18" width="8" height="18" rx="2" fill="currentColor" opacity="0.4" />
            <rect x="28" y="8" width="8" height="28" rx="2" fill="currentColor" opacity="0.5" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No {tab === "titles" ? "job titles" : "companies"} yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-xs text-gray-400 w-5 flex-shrink-0 text-right">{i + 1}</span>
              {/* Name */}
              <span className="flex-1 text-sm text-gray-800 truncate min-w-0" title={entry.name}>
                {entry.name}
              </span>
              {/* Mini bar */}
              <div className="w-16 h-2 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full"
                  style={{ width: `${Math.round((entry.count / maxCount) * 100)}%` }}
                />
              </div>
              {/* Score badge */}
              <div className="flex-shrink-0">
                <ScoreBadge score={entry.avgScore} />
              </div>
              {/* Count */}
              <span className="text-xs text-gray-400 flex-shrink-0 w-6 text-right">{entry.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ResumePerformanceListProps {
  resumes: ResumePerformance[];
}

export function ResumePerformanceList({ resumes }: ResumePerformanceListProps) {
  if (resumes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" viewBox="0 0 48 48" fill="none">
          <rect x="10" y="4" width="28" height="36" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="16" y1="14" x2="32" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <line x1="16" y1="20" x2="32" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <line x1="16" y1="26" x2="26" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          <circle cx="36" cy="36" r="8" fill="currentColor" opacity="0.15" />
          <path d="M33 36l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">No resume analyses yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Analyze a resume against job listings to compare performance</p>
      </div>
    );
  }

  const maxCount = Math.max(...resumes.map((r) => r.analysisCount), 1);

  return (
    <div className="space-y-2">
      {resumes.map((resume, i) => (
        <div key={resume.resumeId} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{resume.name}</p>
            <p className="text-xs text-gray-400">{resume.analysisCount} analyses</p>
          </div>
          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${Math.round((resume.analysisCount / maxCount) * 100)}%` }}
            />
          </div>
          <ScoreBadge score={resume.avgScore} />
        </div>
      ))}
    </div>
  );
}

interface KeywordGapListProps {
  gaps: KeywordGap[];
}

export function KeywordGapList({ gaps }: KeywordGapListProps) {
  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" viewBox="0 0 48 48" fill="none">
          <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="32" y1="32" x2="44" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
          <line x1="16" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <line x1="22" y1="16" x2="22" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">No keyword gaps found</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Run resume analysis to surface missing keywords</p>
      </div>
    );
  }

  const maxCount = Math.max(...gaps.map((g) => g.count), 1);

  return (
    <div className="space-y-2">
      {gaps.map((gap) => (
        <div key={gap.keyword} className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{gap.keyword}</span>
          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-400 rounded-full"
              style={{ width: `${Math.round((gap.count / maxCount) * 100)}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold text-gray-500">{gap.count}</span>
        </div>
      ))}
    </div>
  );
}

// ── SourceConversionTable ─────────────────────────────────────────────────────

interface SourceConversionTableProps {
  sources: SourceConversion[];
}

export function SourceConversionTable({ sources }: SourceConversionTableProps) {
  const [activeSource, setActiveSource] = useState<string | null>(null);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-200 dark:text-gray-700" viewBox="0 0 48 48" fill="none">
          <circle cx="12" cy="24" r="6" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <circle cx="36" cy="12" r="6" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <circle cx="36" cy="36" r="6" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <line x1="18" y1="21" x2="30" y2="15" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <line x1="18" y1="27" x2="30" y2="33" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">No source data yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Jobs from different sources will appear here once scraped</p>
      </div>
    );
  }

  const activeSrc = sources.find((s) => s.source === activeSource);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left pb-2 font-medium">Source</th>
              <th className="text-right pb-2 font-medium">Jobs</th>
              <th className="text-right pb-2 font-medium">Applied</th>
              <th className="text-right pb-2 font-medium">Interviews</th>
              <th className="text-right pb-2 font-medium">Rate</th>
              <th className="text-right pb-2 font-medium">Avg Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {sources.map((s) => {
              const isActive = activeSource === s.source;
              return (
                <tr
                  key={s.source}
                  onClick={() => setActiveSource(isActive ? null : s.source)}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                  title="Click to see breakdown"
                >
                  <td className="py-2 font-medium text-gray-800 dark:text-gray-200 capitalize">
                    <span className="flex items-center gap-1.5">
                      {s.source}
                      {isActive && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{s.totalJobs}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{s.appliedCount}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{s.interviewCount}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                    {s.totalJobs > 0 ? `${Math.round((s.appliedCount / s.totalJobs) * 100)}%` : "—"}
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.avgScore >= 70
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : s.avgScore >= 40
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {s.avgScore}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeSrc && (
        <DrillDownPanel
          title={`${activeSrc.source} — status breakdown`}
          onClose={() => setActiveSource(null)}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Jobs", value: activeSrc.totalJobs, color: "text-indigo-600 dark:text-indigo-400" },
              { label: "Applied", value: activeSrc.appliedCount, color: "text-blue-600 dark:text-blue-400" },
              { label: "Interviews", value: activeSrc.interviewCount, color: "text-amber-600 dark:text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Application rate</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full"
                  style={{ width: `${activeSrc.totalJobs > 0 ? Math.round((activeSrc.appliedCount / activeSrc.totalJobs) * 100) : 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-8 text-right">
                {activeSrc.totalJobs > 0 ? `${Math.round((activeSrc.appliedCount / activeSrc.totalJobs) * 100)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Interview rate</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${activeSrc.appliedCount > 0 ? Math.round((activeSrc.interviewCount / activeSrc.appliedCount) * 100) : 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-8 text-right">
                {activeSrc.appliedCount > 0 ? `${Math.round((activeSrc.interviewCount / activeSrc.appliedCount) * 100)}%` : "—"}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Avg match score: <span className="font-semibold text-gray-600 dark:text-gray-300">{activeSrc.avgScore}%</span></p>
        </DrillDownPanel>
      )}

      {sources.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click a row to see the source breakdown</p>
      )}
    </div>
  );
}
