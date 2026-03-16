"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AnalysisPanel from "@/components/AnalysisPanel";
import JobPickerModal from "@/components/JobPickerModal";
import type { ResumeData, ResumeAnalysisData } from "@/types";

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
        // Upsert: replace existing analysis for same job, or prepend new one
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

  const existingJobIds = resume?.analyses.map((a) => a.jobId) ?? [];

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
        <div className="flex items-start justify-between gap-4">
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

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
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
        </div>
      </div>

      {/* Analyses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Job Analyses
          </h2>
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
          <div className="space-y-3">
            {resume.analyses.map((analysis, i) => (
              <AnalysisPanel
                key={analysis.id}
                analysis={analysis}
                defaultExpanded={i === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Job Picker Modal */}
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
    </div>
  );
}
