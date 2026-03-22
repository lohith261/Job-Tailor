"use client";

import type { ResumeData } from "@/types";

interface Props {
  resumeA: ResumeData;
  resumeB: ResumeData;
  onClose: () => void;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type WinnerSide = "A" | "B" | "tie";

interface Metric {
  label: string;
  valueA: string;
  valueB: string;
  winner: WinnerSide;
  detail?: string;
}

function buildMetrics(a: ResumeData, b: ResumeData): Metric[] {
  const metrics: Metric[] = [];

  // Word count
  const wordWinner: WinnerSide =
    a.wordCount > b.wordCount ? "A" : b.wordCount > a.wordCount ? "B" : "tie";
  metrics.push({
    label: "Word Count",
    valueA: a.wordCount.toLocaleString(),
    valueB: b.wordCount.toLocaleString(),
    winner: wordWinner,
    detail: "More content can mean more keyword coverage",
  });

  // Upload date (newer = better = winner)
  const dateA = new Date(a.createdAt).getTime();
  const dateB = new Date(b.createdAt).getTime();
  const dateWinner: WinnerSide =
    dateA > dateB ? "A" : dateB > dateA ? "B" : "tie";
  metrics.push({
    label: "Upload Date",
    valueA: formatDate(a.createdAt),
    valueB: formatDate(b.createdAt),
    winner: dateWinner,
    detail: "More recently added resume",
  });

  // Analysis count
  const countA = a.analysisCount ?? 0;
  const countB = b.analysisCount ?? 0;
  const countWinner: WinnerSide =
    countA > countB ? "A" : countB > countA ? "B" : "tie";
  metrics.push({
    label: "Analyses Run",
    valueA: String(countA),
    valueB: String(countB),
    winner: countWinner,
    detail: "Number of job analyses completed",
  });

  // Match score (only when both have job analysis)
  if (a.jobAnalysis && b.jobAnalysis) {
    const scoreWinner: WinnerSide =
      a.jobAnalysis.matchScore > b.jobAnalysis.matchScore
        ? "A"
        : b.jobAnalysis.matchScore > a.jobAnalysis.matchScore
        ? "B"
        : "tie";
    metrics.push({
      label: "Job Match Score",
      valueA: `${a.jobAnalysis.matchScore}%`,
      valueB: `${b.jobAnalysis.matchScore}%`,
      winner: scoreWinner,
      detail: "Higher score = stronger match for selected job",
    });

    const kwA = a.jobAnalysis.presentKeywordsCount;
    const kwB = b.jobAnalysis.presentKeywordsCount;
    const kwWinner: WinnerSide = kwA > kwB ? "A" : kwB > kwA ? "B" : "tie";
    metrics.push({
      label: "Keywords Matched",
      valueA: String(kwA),
      valueB: String(kwB),
      winner: kwWinner,
      detail: "Matched keywords from the job description",
    });

    const mkA = a.jobAnalysis.missingKeywordsCount;
    const mkB = b.jobAnalysis.missingKeywordsCount;
    // fewer missing = better
    const mkWinner: WinnerSide = mkA < mkB ? "A" : mkB < mkA ? "B" : "tie";
    metrics.push({
      label: "Missing Keywords",
      valueA: String(mkA),
      valueB: String(mkB),
      winner: mkWinner,
      detail: "Fewer missing keywords = better fit",
    });
  } else if (a.jobAnalysis || b.jobAnalysis) {
    // Only one has analysis
    const hasAnalysisWinner: WinnerSide = a.jobAnalysis ? "A" : "B";
    const scoreVal = a.jobAnalysis
      ? `${a.jobAnalysis.matchScore}%`
      : b.jobAnalysis
      ? `${b.jobAnalysis.matchScore}%`
      : "—";
    metrics.push({
      label: "Job Match Score",
      valueA: a.jobAnalysis ? `${a.jobAnalysis.matchScore}%` : "No analysis",
      valueB: b.jobAnalysis ? `${b.jobAnalysis.matchScore}%` : "No analysis",
      winner: hasAnalysisWinner,
      detail: scoreVal !== "—" ? "Only one resume has been analyzed for the current job" : undefined,
    });
  }

  return metrics;
}

function winnerCount(metrics: Metric[], side: "A" | "B") {
  return metrics.filter((m) => m.winner === side).length;
}

function WinBadge({ side }: { side: WinnerSide }) {
  if (side === "tie") {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
        Tie
      </span>
    );
  }
  const color =
    side === "A"
      ? "bg-blue-100 text-blue-700"
      : "bg-violet-100 text-violet-700";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}
    >
      {side === "A" ? "Left wins" : "Right wins"}
    </span>
  );
}

export default function ResumeCompareModal({ resumeA, resumeB, onClose }: Props) {
  const metrics = buildMetrics(resumeA, resumeB);
  const winsA = winnerCount(metrics, "A");
  const winsB = winnerCount(metrics, "B");
  const overallWinner: WinnerSide =
    winsA > winsB ? "A" : winsB > winsA ? "B" : "tie";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Resume Comparison</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Side-by-side breakdown of key metrics
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close comparison"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Resume name headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-6 pt-5 pb-3">
          <div
            className={`rounded-xl p-3 text-center border-2 ${
              overallWinner === "A"
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Resume 1
            </p>
            <p className="font-semibold text-gray-900 truncate" title={resumeA.name}>
              {resumeA.name}
            </p>
            {resumeA.isPrimary && (
              <span className="mt-1 inline-block text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                Primary
              </span>
            )}
            {overallWinner === "A" && (
              <p className="mt-2 text-xs font-bold text-blue-700">
                Overall Winner ({winsA}/{metrics.length})
              </p>
            )}
          </div>

          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">vs</span>
              {overallWinner === "tie" && (
                <span className="text-[11px] text-gray-400 font-medium">Tied</span>
              )}
            </div>
          </div>

          <div
            className={`rounded-xl p-3 text-center border-2 ${
              overallWinner === "B"
                ? "border-violet-400 bg-violet-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Resume 2
            </p>
            <p className="font-semibold text-gray-900 truncate" title={resumeB.name}>
              {resumeB.name}
            </p>
            {resumeB.isPrimary && (
              <span className="mt-1 inline-block text-[11px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                Primary
              </span>
            )}
            {overallWinner === "B" && (
              <p className="mt-2 text-xs font-bold text-violet-700">
                Overall Winner ({winsB}/{metrics.length})
              </p>
            )}
          </div>
        </div>

        {/* Metric rows */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {metrics.map((metric) => {
            const aWins = metric.winner === "A";
            const bWins = metric.winner === "B";

            return (
              <div
                key={metric.label}
                className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center"
              >
                {/* Left value */}
                <div
                  className={`rounded-lg px-3 py-2.5 text-center transition-colors ${
                    aWins
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <p
                    className={`text-base font-bold ${
                      aWins ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {metric.valueA}
                  </p>
                  {aWins && (
                    <svg
                      className="w-3.5 h-3.5 text-blue-500 mx-auto mt-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Middle label */}
                <div className="flex flex-col items-center gap-1 min-w-[110px] text-center px-1">
                  <p className="text-xs font-semibold text-gray-600">{metric.label}</p>
                  <WinBadge side={metric.winner} />
                  {metric.detail && (
                    <p className="text-[10px] text-gray-400 leading-tight">{metric.detail}</p>
                  )}
                </div>

                {/* Right value */}
                <div
                  className={`rounded-lg px-3 py-2.5 text-center transition-colors ${
                    bWins
                      ? "bg-violet-50 border border-violet-200"
                      : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  <p
                    className={`text-base font-bold ${
                      bWins ? "text-violet-700" : "text-gray-700"
                    }`}
                  >
                    {metric.valueB}
                  </p>
                  {bWins && (
                    <svg
                      className="w-3.5 h-3.5 text-violet-500 mx-auto mt-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          {overallWinner === "tie" ? (
            <p className="text-sm text-center text-gray-500 font-medium">
              Both resumes are evenly matched across all metrics.
            </p>
          ) : (
            <p className="text-sm text-center text-gray-700">
              <span
                className={`font-bold ${
                  overallWinner === "A" ? "text-blue-700" : "text-violet-700"
                }`}
              >
                {overallWinner === "A" ? resumeA.name : resumeB.name}
              </span>{" "}
              wins{" "}
              <span className="font-semibold">
                {overallWinner === "A" ? winsA : winsB}
              </span>{" "}
              of{" "}
              <span className="font-semibold">{metrics.length}</span> metrics.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
