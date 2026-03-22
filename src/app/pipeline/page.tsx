"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface PipelineRun {
  id: string;
  status: string;
  scrapeCount: number;
  newJobsCount: number;
  analyzedCount: number;
  coverLetterCount: number;
  autoTrackedCount: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface ReadyJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  matchScore: number;
  application: { id: string; status: string } | null;
  analysis: {
    matchScore: number;
    missingKeywords: string[];
    summary: string;
  } | null;
  coverLetter: {
    content: string;
    tone: string;
    preview: string;
  } | null;
}

const STATUS_BADGE: Record<string, string> = {
  running: "bg-blue-100 text-blue-700 animate-pulse",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-100 text-green-700" :
    score >= 40 ? "bg-amber-100 text-amber-700" :
    "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${color}`}>
      {score}
    </span>
  );
}

export default function PipelinePage() {
  const [history, setHistory] = useState<PipelineRun[]>([]);
  const [readyJobs, setReadyJobs] = useState<ReadyJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [readyLoading, setReadyLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [threshold, setThreshold] = useState(65);
  const [maxJobs, setMaxJobs] = useState(10);
  const [tone, setTone] = useState<"professional" | "conversational" | "enthusiastic">("professional");
  const [lastRunResult, setLastRunResult] = useState<PipelineRun | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<string | null>(null);
  const [expandedCoverLetter, setExpandedCoverLetter] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "failed">("all");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savedDefaults, setSavedDefaults] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/history");
      if (res.ok) setHistory(await res.json());
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchReadyJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline/ready");
      if (res.ok) setReadyJobs(await res.json());
    } finally {
      setReadyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchReadyJobs();
  }, [fetchHistory, fetchReadyJobs]);

  // Load pipeline defaults from saved config on mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(config => {
        if (!config) return;
        if (config.pipelineThreshold != null) setThreshold(config.pipelineThreshold);
        if (config.pipelineMaxJobs != null) setMaxJobs(config.pipelineMaxJobs);
        if (config.pipelineTone) setTone(config.pipelineTone as "professional" | "conversational" | "enthusiastic");
      })
      .catch(() => {});
  }, []);

  const nextRunLabel = useMemo(() => {
    const now = new Date();
    const todayRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
    const target = now.getTime() < todayRun.getTime() ? todayRun : new Date(todayRun.getTime() + 86400000);
    const diffH = Math.round((target.getTime() - now.getTime()) / 3600000);
    if (diffH <= 1) return "In less than 1 hour";
    if (diffH < 24) return `In ~${diffH} hours`;
    return "Tomorrow at 08:00 UTC";
  }, []);

  async function runPipeline() {
    setRunning(true);
    setLastRunResult(null);
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold, maxJobs, tone }),
      });
      if (res.ok) {
        const result = await res.json();
        setLastRunResult(result);
        await fetchHistory();
        await fetchReadyJobs();
      }
    } finally {
      setRunning(false);
    }
  }

  async function saveDefaults() {
    setSavingDefaults(true);
    setSavedDefaults(false);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineThreshold: threshold, pipelineMaxJobs: maxJobs, pipelineTone: tone }),
      });
      setSavedDefaults(true);
      setTimeout(() => setSavedDefaults(false), 2500);
    } finally {
      setSavingDefaults(false);
    }
  }

  function formatDuration(ms: number | null) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automation Pipeline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scrape → Analyse → Cover Letter → Track. Runs daily at 08:00 UTC automatically.
        </p>
      </div>

      {/* Scheduled run info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Automatic daily run</p>
            <p className="text-xs text-gray-500">Scheduled at 08:00 UTC every day · uses your saved defaults</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Next run</p>
          <p className="text-sm font-semibold text-gray-900">{nextRunLabel}</p>
        </div>
      </div>

      {/* Run Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Run Config</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Threshold */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Min Match Score: <span className="font-bold text-indigo-600">{threshold}</span>
            </label>
            <input
              type="range" min={0} max={100} value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>
          {/* Max jobs */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Max Jobs per Run
            </label>
            <input
              type="number" min={1} max={20} value={maxJobs}
              onChange={(e) => setMaxJobs(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/* Tone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cover Letter Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as typeof tone)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runPipeline}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {running ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Running Pipeline…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653Z" />
                </svg>
                Run Pipeline Now
              </>
            )}
          </button>

          <button
            onClick={saveDefaults}
            disabled={savingDefaults}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {savingDefaults ? "Saving…" : savedDefaults ? "✓ Saved" : "Save as defaults"}
          </button>
        </div>

        {running && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 space-y-1">
            <p className="font-semibold">Pipeline running… (this takes 20–60 seconds)</p>
            <ol className="list-decimal list-inside space-y-0.5 text-indigo-700 text-xs">
              <li>Scraping all job sources in parallel</li>
              <li>Selecting top-scoring jobs above threshold {threshold}</li>
              <li>Running AI resume analysis on up to {maxJobs} jobs</li>
              <li>Generating {tone} cover letters</li>
              <li>Adding to Application Tracker</li>
            </ol>
          </div>
        )}

        {lastRunResult && !running && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">✓ Pipeline completed in {formatDuration(lastRunResult.durationMs)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Jobs scraped", value: lastRunResult.scrapeCount },
                { label: "New jobs", value: lastRunResult.newJobsCount },
                { label: "Analysed", value: lastRunResult.analyzedCount },
                { label: "Cover letters", value: lastRunResult.coverLetterCount },
                { label: "Auto-tracked", value: lastRunResult.autoTrackedCount },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-lg border border-green-100 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {lastRunResult.errors.length > 0 && (
              <p className="text-xs text-amber-700 mt-2">{lastRunResult.errors.length} non-fatal error(s) — see history for details</p>
            )}
          </div>
        )}
      </div>

      {/* Ready to Apply */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Ready to Apply
          {!readyLoading && <span className="ml-2 text-sm font-normal text-gray-500">({readyJobs.length} jobs)</span>}
        </h2>

        {readyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : readyJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-gray-600 font-medium">No jobs ready yet</p>
            <p className="text-sm text-gray-400 mt-1">Run the pipeline above to automatically analyse jobs and generate cover letters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readyJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                {/* Job header */}
                <div className="flex items-start gap-3">
                  <ScoreBadge score={job.matchScore} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
                    <p className="text-sm text-gray-500">{job.company} {job.location ? `· ${job.location}` : ""}</p>
                    {job.application && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {job.application.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Analysis summary */}
                {job.analysis && (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <p className="font-medium text-gray-700 mb-1">AI Analysis — {job.analysis.matchScore}/100</p>
                    <p className="line-clamp-2">{job.analysis.summary}</p>
                    {job.analysis.missingKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.analysis.missingKeywords.slice(0, 4).map((kw) => (
                          <span key={kw} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">{kw}</span>
                        ))}
                        {job.analysis.missingKeywords.length > 4 && (
                          <span className="text-gray-400">+{job.analysis.missingKeywords.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Cover letter preview */}
                {job.coverLetter && (
                  <div>
                    <button
                      onClick={() => setExpandedCoverLetter(expandedCoverLetter === job.id ? null : job.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                        <span>Cover Letter ({job.coverLetter.tone})</span>
                        <span className="text-indigo-500">{expandedCoverLetter === job.id ? "Collapse ↑" : "Expand ↓"}</span>
                      </div>
                      {expandedCoverLetter !== job.id && (
                        <p className="text-xs text-gray-500 italic line-clamp-2">{job.coverLetter.preview}…</p>
                      )}
                    </button>
                    {expandedCoverLetter === job.id && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          readOnly
                          value={job.coverLetter.content}
                          rows={8}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 resize-none bg-gray-50"
                        />
                        <button
                          onClick={() => navigator.clipboard.writeText(job.coverLetter!.content)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Copy cover letter
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open & Apply
                  </a>
                  {job.coverLetter && (
                    <button
                      onClick={() => navigator.clipboard.writeText(job.coverLetter!.content)}
                      className="px-3 py-2 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      title="Copy cover letter to clipboard"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline History</h2>
          <div className="flex gap-1.5">
            {(["all", "completed", "failed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  historyFilter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {historyLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-500 text-sm">No runs yet — click "Run Pipeline Now" above to start</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Status", "Date", "Duration", "Scraped", "New", "Analysed", "Cover Letters", "Tracked", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.filter((run) => historyFilter === "all" || run.status === historyFilter).map((run) => (
                  <>
                    <tr key={run.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[run.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(run.startedAt)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDuration(run.durationMs)}</td>
                      <td className="px-4 py-3 font-medium">{run.scrapeCount}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">+{run.newJobsCount}</td>
                      <td className="px-4 py-3 font-medium">{run.analyzedCount}</td>
                      <td className="px-4 py-3 font-medium">{run.coverLetterCount}</td>
                      <td className="px-4 py-3 font-medium">{run.autoTrackedCount}</td>
                      <td className="px-4 py-3">
                        {run.errors.length > 0 && (
                          <button
                            onClick={() => setExpandedErrors(expandedErrors === run.id ? null : run.id)}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                          >
                            {run.errors.length} error{run.errors.length > 1 ? "s" : ""}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedErrors === run.id && run.errors.length > 0 && (
                      <tr key={`${run.id}-errors`}>
                        <td colSpan={9} className="px-4 pb-3">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                            {run.errors.map((err, i) => (
                              <p key={i} className="text-xs text-amber-800">• {err}</p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application instructions banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-800">
          Applications are opened in a new tab. Copy your cover letter, then paste it into the job application form.
        </p>
      </div>
    </div>
  );
}
