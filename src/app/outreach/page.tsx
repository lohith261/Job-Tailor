"use client";

import { useState, useEffect, useCallback } from "react";
import type { OutreachEmailData } from "@/types";

// ─── Email card ────────────────────────────────────────────────────────────────

function EmailCard({
  record,
  onDelete,
}: {
  record: OutreachEmailData;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  function copy(text: string, which: "subject" | "body") {
    navigator.clipboard.writeText(text).then(() => {
      if (which === "subject") {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
    });
  }

  const info = record.companyInfo;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Logo placeholder */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {record.companyName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{record.companyName}</p>
          <p className="text-xs text-gray-500 truncate">{record.companyUrl}</p>
          <p className="text-sm text-gray-600 truncate mt-0.5 italic">&ldquo;{record.emailSubject}&rdquo;</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {info.industry && (
            <span className="hidden sm:inline-flex text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {info.industry}
            </span>
          )}
          {info.size && (
            <span className="hidden sm:inline-flex text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {info.size}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Company research card */}
          <div className="px-5 pt-4 pb-3 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">{info.description || "No description extracted."}</p>

              {info.highlights.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Key highlights</p>
                  <ul className="space-y-1">
                    {info.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                        <span className="text-indigo-400 mt-0.5">→</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {info.techStack.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {info.techStack.map((t) => (
                      <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {info.culture.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Culture</p>
                  <div className="flex flex-wrap gap-1.5">
                    {info.culture.map((c) => (
                      <span key={c} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="px-5 py-4 space-y-3">
            {/* Subject */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Subject</p>
                <button
                  onClick={() => copy(record.emailSubject, "subject")}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {copiedSubject ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">
                {record.emailSubject}
              </p>
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Email Body</p>
                <button
                  onClick={() => copy(record.emailBody, "body")}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {copiedBody ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-3 whitespace-pre-wrap leading-relaxed font-sans">
                {record.emailBody}
              </pre>
            </div>

            {/* Copy all + delete */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => copy(`Subject: ${record.emailSubject}\n\n${record.emailBody}`, "body")}
                className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy full email
              </button>
              <button
                onClick={() => onDelete(record.id)}
                className="text-sm text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<OutreachEmailData[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeResult, setActiveResult] = useState<OutreachEmailData | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/outreach");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setGenerating(true);
    setActiveResult(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyUrl: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const data: OutreachEmailData = await res.json();
      setActiveResult(data);
      setHistory((prev) => [data, ...prev]);
      setUrl("");
      showToast(`Email generated for ${data.companyName}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate email", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this outreach email?")) return;
    try {
      await fetch(`/api/outreach/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((r) => r.id !== id));
      if (activeResult?.id === id) setActiveResult(null);
      showToast("Deleted");
    } catch {
      showToast("Failed to delete", "error");
    }
  }

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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cold Outreach</h1>
        <p className="text-gray-500 mt-1">
          Found a company you love but they have no open roles? Paste their URL and we&apos;ll research them and write a personalized email.
        </p>
      </div>

      {/* URL Input card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">
          Company Research
        </p>
        <h2 className="text-lg font-semibold mb-4">
          Paste the company URL and we&apos;ll do the rest
        </h2>
        <form onSubmit={handleGenerate} className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com  or  company.com/careers"
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <button
            type="submit"
            disabled={generating || !url.trim()}
            className="flex items-center gap-2 bg-white text-slate-900 font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-slate-100 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Researching…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Email
              </>
            )}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-400">
          We&apos;ll scrape the page, research the company with AI, and write a personalised email using your primary resume.
        </p>
      </div>

      {/* Active result (newly generated) */}
      {activeResult && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Just generated
            </span>
          </div>
          <EmailCard record={activeResult} onDelete={handleDelete} />
        </div>
      )}

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Outreach History</h2>
          {history.length > 0 && (
            <p className="text-sm text-gray-500">{history.length} email{history.length !== 1 ? "s" : ""}</p>
          )}
        </div>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <div className="text-5xl mb-3">✉️</div>
            <p className="text-gray-600 font-medium">No outreach emails yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Paste a company URL above to generate your first cold email
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history
              .filter((r) => r.id !== activeResult?.id)
              .map((record) => (
                <EmailCard key={record.id} record={record} onDelete={handleDelete} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
