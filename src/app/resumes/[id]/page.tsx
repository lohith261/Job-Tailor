"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";
import JobPickerModal from "@/components/JobPickerModal";
import TailoredResumePanel from "@/components/TailoredResumePanel";
import type { ResumeData, ResumeAnalysisData, TailoredResumeData } from "@/types";

interface ResumeWithAnalyses extends ResumeData {
  analyses: ResumeAnalysisData[];
}

interface JobChoice {
  id: string;
  title: string;
  company: string;
  location?: string;
  locationType?: string;
  matchScore: number;
  status: string;
}

const FORMAT_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  txt: "bg-gray-100 text-gray-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [resume, setResume] = useState<ResumeWithAnalyses | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Tailored resume state — keyed by jobId
  const [tailoredMap, setTailoredMap] = useState<Record<string, TailoredResumeData>>({});
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchResume = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (!res.ok) {
        router.push("/resumes");
        return;
      }
      const data = await res.json();
      setResume(data);
    } catch {
      router.push("/resumes");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  async function handleAnalyze(job: JobChoice) {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/resumes/${id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const newAnalysis = await res.json();
      setResume((prev) => {
        if (!prev) return prev;
        const filtered = prev.analyses.filter((a) => a.jobId !== job.id);
        return { ...prev, analyses: [newAnalysis, ...filtered] };
      });
      setShowModal(false);
      showToast("Analysis complete!");
    } catch {
      showToast("Analysis failed. Please try again.", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateForJob(jobId: string) {
    setGeneratingJobId(jobId);
    try {
      const res = await fetch(`/api/resumes/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data: TailoredResumeData = await res.json();
      setTailoredMap((prev) => ({ ...prev, [jobId]: data }));
      showToast(`ATS resume generated — projected score: ${data.projectedScore}%`);
    } catch {
      showToast("Resume generation failed. Please try again.", "error");
    } finally {
      setGeneratingJobId(null);
    }
  }

  async function handleGenerateForNewJob(job: JobChoice) {
    setShowGenerateModal(false);
    await generateForJob(job.id);
  }

  const existingJobIds = resume?.analyses.map((a) => a.jobId) ?? [];
  const allJobIds = [
    ...new Set([
      ...existingJobIds,
      ...Object.keys(tailoredMap),
    ]),
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!resume) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-5">
        <Link href="/resumes" className="hover:text-blue-600 transition-colors">
          Resume Tailoring
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium truncate">{resume.name}</span>
      </nav>

      {/* Resume header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {resume.isPrimary && (
                <span className="text-xs font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  ★ Primary
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${FORMAT_COLORS[resume.format] ?? "bg-gray-100 text-gray-700"}`}>
                {resume.format}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{resume.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{resume.fileName}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex-shrink-0 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Generate ATS Resume
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex-shrink-0 flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Analyze Against a Job
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {resume.wordCount.toLocaleString()} words
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Uploaded {formatDate(resume.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {resume.analyses.length} {resume.analyses.length === 1 ? "analysis" : "analyses"}
          </span>
          {Object.keys(tailoredMap).length > 0 && (
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {Object.keys(tailoredMap).length} ATS resume{Object.keys(tailoredMap).length !== 1 ? "s" : ""} generated
            </span>
          )}
        </div>
      </div>

      {/* Analyses section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Job Analyses</h2>
          {resume.analyses.length > 0 && (
            <p className="text-sm text-gray-500">
              {resume.analyses.length} job{resume.analyses.length !== 1 ? "s" : ""} analyzed
            </p>
          )}
        </div>

        {resume.analyses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-600 font-medium">No analyses yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Compare this resume against any job in your inbox
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Analyze Against a Job
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {resume.analyses.map((analysis, i) => (
              <div key={analysis.id} className="space-y-3">
                <AnalysisPanel analysis={analysis} defaultExpanded={i === 0} />

                {/* Generate ATS Resume button per analysis */}
                <div className="ml-1">
                  {tailoredMap[analysis.jobId] ? (
                    <TailoredResumePanel
                      tailored={tailoredMap[analysis.jobId]}
                      onRegenerate={() => generateForJob(analysis.jobId)}
                      regenerating={generatingJobId === analysis.jobId}
                    />
                  ) : (
                    <button
                      onClick={() => generateForJob(analysis.jobId)}
                      disabled={generatingJobId === analysis.jobId}
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition-colors"
                    >
                      {generatingJobId === analysis.jobId ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Generating ATS resume…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          Generate ATS-Optimized Resume for this job
                          {analysis.matchScore < 90 && (
                            <span className="ml-1 text-xs text-emerald-500">(target: 90+ score)</span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Standalone tailored resumes (for jobs not yet analyzed) */}
      {Object.values(tailoredMap).filter((t) => !existingJobIds.includes(t.jobId)).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated ATS Resumes</h2>
          <div className="space-y-4">
            {Object.values(tailoredMap)
              .filter((t) => !existingJobIds.includes(t.jobId))
              .map((tailored) => (
                <TailoredResumePanel
                  key={tailored.jobId}
                  tailored={tailored}
                  onRegenerate={() => generateForJob(tailored.jobId)}
                  regenerating={generatingJobId === tailored.jobId}
                />
              ))}
          </div>
        </div>
      )}

      {/* Analyze modal */}
      {showModal && (
        <JobPickerModal
          onSelect={handleAnalyze}
          onClose={() => setShowModal(false)}
          analyzing={analyzing}
          excludeJobIds={existingJobIds}
          title="Pick a new job to analyze"
          subtitle="Choose a job from your inbox that this resume has not been compared against yet."
        />
      )}

      {/* Generate ATS Resume modal */}
      {showGenerateModal && (
        <JobPickerModal
          onSelect={handleGenerateForNewJob}
          onClose={() => setShowGenerateModal(false)}
          analyzing={generatingJobId !== null}
          title="Pick a job to generate ATS resume"
          subtitle="We'll rewrite your resume using the job description to target a 90+ ATS match score."
        />
      )}
    </div>
  );
}
