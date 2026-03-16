"use client";

import { useState } from "react";
import { ScoreBadge } from "./ScoreBadge";
import type {
  FunnelStage,
  KeywordGap,
  ResumePerformance,
  ScoreBucket,
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

// ── FunnelChart ───────────────────────────────────────────────────────────────

interface FunnelChartProps {
  stages: FunnelStage[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const svgHeight = stages.length * 44 + 8;

  const appliedCount = stages.find((s) => s.status === "applied")?.count ?? 0;
  const interviewCount = stages.find((s) => s.status === "interview")?.count ?? 0;
  const offerCount = stages.find((s) => s.status === "offer")?.count ?? 0;
  const responseRate = appliedCount > 0
    ? Math.round(((interviewCount + offerCount) / appliedCount) * 100)
    : 0;

  return (
    <div>
      <svg
        viewBox={`0 0 400 ${svgHeight}`}
        width="100%"
        aria-label="Application funnel chart"
      >
        {stages.map((stage, i) => {
          const rowY = i * 44 + 4;
          const barWidth = maxCount > 0 ? Math.max(4, Math.round(280 * (stage.count / maxCount))) : 0;
          const fillColor = FUNNEL_COLORS[stage.color] ?? "#6366f1";

          return (
            <g key={stage.status}>
              {/* Label */}
              <text x="85" y={rowY + 20} textAnchor="end" fontSize="12" fill="#6b7280">
                {stage.label}
              </text>
              {/* Track */}
              <rect x={90} y={rowY + 4} width={280} height={24} rx={4} fill="#f3f4f6" />
              {/* Fill */}
              {stage.count > 0 && (
                <rect x={90} y={rowY + 4} width={barWidth} height={24} rx={4} fill={fillColor} />
              )}
              {/* Count */}
              <text x={378} y={rowY + 20} textAnchor="end" fontSize="12" fontWeight="600" fill="#374151">
                {stage.count}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-gray-400 mt-2">
        Response rate: <span className="font-medium text-gray-600">{responseRate}%</span>
        <span className="ml-1">(interviews + offers / applied)</span>
      </p>
    </div>
  );
}

// ── ScoreDistributionChart ────────────────────────────────────────────────────

interface ScoreDistributionChartProps {
  buckets: ScoreBucket[];
}

export function ScoreDistributionChart({ buckets }: ScoreDistributionChartProps) {
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
      <svg viewBox="0 0 500 180" width="100%">
        <text x="250" y="90" textAnchor="middle" fontSize="13" fill="#9ca3af">
          Not enough data yet — needs 2+ weeks of job activity
        </text>
      </svg>
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
        <p className="text-sm text-gray-400 italic py-4 text-center">No data yet</p>
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
    return <p className="text-sm text-gray-400 italic py-4 text-center">No resume analyses yet</p>;
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
    return <p className="text-sm text-gray-400 italic py-4 text-center">No keyword gaps yet</p>;
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
