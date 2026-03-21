"use client";

import { useState, useEffect, useCallback } from "react";

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  locationType?: string;
  matchScore: number;
  status: string;
}

interface Props {
  onSelect: (job: Job) => void;
  onClose: () => void;
  analyzing?: boolean;
  excludeJobIds?: string[];
  title?: string;
  subtitle?: string;
}

export default function JobPickerModal({
  onSelect,
  onClose,
  analyzing = false,
  excludeJobIds = [],
  title = "Pick a Job to Analyze Against",
  subtitle = "Select a job from your inbox to compare with this resume",
}: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("sortBy", "matchScore");
      params.set("sortOrder", "desc");
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      const allJobs: Job[] = data.jobs ?? [];
      setJobs(allJobs.filter((j) => !excludeJobIds.includes(j.id)));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [search, excludeJobIds]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchJobs, 300);
    return () => clearTimeout(t);
  }, [search, fetchJobs]);

  function getScoreColor(score: number) {
    if (score >= 70) return "text-green-700 bg-green-100";
    if (score >= 40) return "text-yellow-700 bg-yellow-100";
    return "text-red-700 bg-red-100";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or company…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No jobs found.</p>
              <p className="text-xs mt-1">Try scraping jobs from the Opportunity Inbox first.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all flex items-center gap-3 ${
                  selectedJobId === job.id
                    ? "bg-blue-50 ring-2 ring-blue-400"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {job.company}
                    {job.location && ` · ${job.location}`}
                    {job.locationType && (
                      <span className="ml-1 text-xs text-gray-400">({job.locationType})</span>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getScoreColor(job.matchScore)}`}>
                  {job.matchScore}%
                </span>
                {selectedJobId === job.id && (
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const selectedJob = jobs.find((job) => job.id === selectedJobId);
              if (selectedJob) onSelect(selectedJob);
            }}
            disabled={!selectedJobId || analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Analyze Match
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
