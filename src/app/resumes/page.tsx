"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ResumeUploader from "@/components/ResumeUploader";
import ResumeCard from "@/components/ResumeCard";
import JobPickerModal from "@/components/JobPickerModal";
import type { ResumeData } from "@/types";

interface SelectedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  locationType?: string;
  matchScore: number;
  status: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [analyzingForResume, setAnalyzingForResume] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<SelectedJob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchResumes = useCallback(async (jobId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobId) params.set("jobId", jobId);
      const query = params.toString();
      const res = await fetch(`/api/resumes${query ? `?${query}` : ""}`);
      const data = await res.json();
      setResumes(Array.isArray(data) ? data : []);
    } catch {
      setResumes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes(selectedJob?.id);
  }, [fetchResumes, selectedJob?.id]);

  async function handleUpload(file: File, name: string) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);

      const res = await fetch("/api/resumes", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const newResume = await res.json();
      setResumes((prev) => [newResume, ...prev]);
      showToast(`"${newResume.name}" uploaded successfully!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
      throw err;
    } finally {
      setUploading(false);
    }
  }

  async function handleTogglePrimary(id: string, currentPrimary: boolean) {
    setMutating(true);
    try {
      await fetch(`/api/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: !currentPrimary }),
      });
      setResumes((prev) =>
        prev.map((r) => ({
          ...r,
          isPrimary: r.id === id ? !currentPrimary : currentPrimary ? false : r.isPrimary,
        }))
      );
    } catch {
      showToast("Failed to update primary resume", "error");
    } finally {
      setMutating(false);
    }
  }

  async function handleDelete(id: string) {
    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;
    if (!confirm(`Delete "${resume.name}"? This will also delete all analyses.`)) return;

    setMutating(true);
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setResumes((prev) => prev.filter((r) => r.id !== id));
      showToast(`"${resume.name}" deleted`);
    } catch {
      showToast("Failed to delete resume", "error");
    } finally {
      setMutating(false);
    }
  }

  async function runAnalysis(resumeId: string, job: SelectedJob) {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      setShowAnalyzeModal(false);
      setAnalyzingForResume(null);
      setSelectedJob(job);
      await fetchResumes(job.id);
      router.push(`/resumes/${resumeId}`);
    } catch {
      showToast("Analysis failed. Please try again.", "error");
    } finally {
      setAnalyzing(false);
    }
  }

  function rankResumes(items: ResumeData[]) {
    return [...items].sort((a, b) => {
      const aScore = a.jobAnalysis?.matchScore ?? -1;
      const bScore = b.jobAnalysis?.matchScore ?? -1;
      if (aScore !== bScore) return bScore - aScore;
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return (b.analysisCount ?? 0) - (a.analysisCount ?? 0);
    });
  }

  const primaryResume = resumes.find((r) => r.isPrimary);
  const rankedResumes = selectedJob ? rankResumes(resumes) : resumes;
  const topResume = rankedResumes[0] ?? null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resume Tailoring</h1>
        <p className="text-gray-500 mt-1">
          Upload your resumes and analyze how well they match any job in your inbox.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Tailoring Workspace
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Choose one job and compare your resumes before you start tailoring.
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Existing analyses are surfaced first, so you can quickly reuse the best resume or run a fresh comparison.
            </p>
          </div>
          <button
            onClick={() => {
              setAnalyzingForResume(null);
              setShowAnalyzeModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Choose Job
          </button>
        </div>

        {selectedJob && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold">{selectedJob.title}</p>
                <p className="text-sm text-slate-300">
                  {selectedJob.company}
                  {selectedJob.location && ` · ${selectedJob.location}`}
                  {selectedJob.locationType && ` · ${selectedJob.locationType}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Job score {selectedJob.matchScore}%
                </span>
                <button
                  onClick={() => {
                    setAnalyzingForResume(null);
                    setShowAnalyzeModal(true);
                  }}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                >
                  Switch Job
                </button>
              </div>
            </div>

            {topResume && (
              <div className="mt-3 rounded-xl bg-white/10 px-3 py-3 text-sm">
                <p className="font-medium text-white">
                  Recommended resume: {topResume.name}
                </p>
                <p className="mt-1 text-slate-300">
                  {topResume.jobAnalysis
                    ? `Existing analysis: ${topResume.jobAnalysis.matchScore}% match with ${topResume.jobAnalysis.missingKeywordsCount} missing keywords.`
                    : topResume.isPrimary
                    ? "No saved analysis yet, but this is your primary resume so it’s the best starting point."
                    : "No saved analysis yet, but this resume is the strongest fallback from your current set."}
                </p>
                <button
                  onClick={() => runAnalysis(topResume.id, selectedJob)}
                  disabled={analyzing}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
                >
                  Analyze recommended resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <ResumeUploader onUpload={handleUpload} uploading={uploading} />

          {primaryResume && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-5 shadow-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
                Primary Resume
              </p>
              <p className="font-semibold truncate">{primaryResume.name}</p>
              <p className="text-sm text-blue-200 mt-0.5">
                {primaryResume.wordCount.toLocaleString()} words · {primaryResume.format.toUpperCase()}
              </p>
              <button
                onClick={() => {
                  setAnalyzingForResume(primaryResume.id);
                  setShowAnalyzeModal(true);
                }}
                className="mt-4 w-full bg-white text-blue-700 text-sm font-semibold rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Analyze Against a Job
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-40 animate-pulse" />
              ))}
            </div>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center bg-white rounded-xl border border-dashed border-gray-300">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-gray-600 font-medium">No resumes yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload your first resume to get started</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Your Resumes ({rankedResumes.length})
                </h2>
                {selectedJob && (
                  <p className="text-xs text-gray-500">
                    Ranked for {selectedJob.title}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rankedResumes.map((resume, index) => (
                  <div key={resume.id}>
                    {selectedJob && index === 0 && (
                      <div className="mb-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Best current fit
                      </div>
                    )}
                    <ResumeCard
                      resume={resume}
                      onTogglePrimary={handleTogglePrimary}
                      onDelete={handleDelete}
                      loading={mutating}
                    />
                    <button
                      onClick={() => {
                        if (selectedJob) {
                          runAnalysis(resume.id, selectedJob);
                          return;
                        }
                        setAnalyzingForResume(resume.id);
                        setShowAnalyzeModal(true);
                      }}
                      className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 py-1 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {selectedJob ? "Analyze this resume for selected job" : "Analyze this resume against a job"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showAnalyzeModal && (
        <JobPickerModal
          onSelect={(job) => {
            setSelectedJob(job);
            if (analyzingForResume) {
              runAnalysis(analyzingForResume, job);
              return;
            }
            setShowAnalyzeModal(false);
          }}
          onClose={() => {
            setShowAnalyzeModal(false);
            setAnalyzingForResume(null);
          }}
          analyzing={analyzing}
          title={analyzingForResume ? "Pick a job for this resume" : "Pick a job to compare your resumes"}
          subtitle={
            analyzingForResume
              ? "Choose a job and we’ll run analysis for the selected resume right away."
              : "Choose a job first to rank your resumes and start tailoring."
          }
        />
      )}
    </div>
  );
}
