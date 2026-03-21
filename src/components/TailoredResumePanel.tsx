"use client";

import { useState, useRef } from "react";
import type { TailoredResumeData } from "@/types";

interface Props {
  tailored: TailoredResumeData;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-emerald-100 text-emerald-700 ring-emerald-300"
      : score >= 80
      ? "bg-blue-100 text-blue-700 ring-blue-300"
      : "bg-amber-100 text-amber-700 ring-amber-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${color}`}>
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {score}% ATS Score
    </span>
  );
}

export default function TailoredResumePanel({ tailored, onRegenerate, regenerating }: Props) {
  const [tab, setTab] = useState<"preview" | "latex">("preview");
  const [copied, setCopied] = useState(false);
  const overleafFormRef = useRef<HTMLFormElement>(null);
  const { resumeData, latexSource, projectedScore, job } = tailored;

  function copyLatex() {
    navigator.clipboard.writeText(latexSource).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadTex() {
    const blob = new Blob([latexSource], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (job?.company ?? "resume").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.href = url;
    a.download = `resume_${safeName}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openInOverleaf() {
    if (overleafFormRef.current) {
      overleafFormRef.current.submit();
    }
  }

  const allSkills = [
    ...resumeData.skills.languages,
    ...resumeData.skills.frameworks,
    ...resumeData.skills.tools,
    ...resumeData.skills.databases,
    ...resumeData.skills.other,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            ATS-Optimized Resume
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {job && (
              <span className="text-sm font-medium text-white">
                {job.title} @ {job.company}
              </span>
            )}
            <ScoreBadge score={projectedScore} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
          )}
          <button
            onClick={copyLatex}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy LaTeX
              </>
            )}
          </button>
          <button
            onClick={downloadTex}
            className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .tex
          </button>
          <button
            onClick={openInOverleaf}
            className="flex items-center gap-1.5 rounded-lg bg-[#4f9d69] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#3d8a56] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-5.5 8.25a.75.75 0 01-1.238-.031l-2.5-4a.75.75 0 011.252-.832l1.888 3.02 4.856-7.285a.75.75 0 011.242.878z" />
            </svg>
            Open in Overleaf
          </button>
          {/* Hidden Overleaf form — submits LaTeX via POST */}
          <form
            ref={overleafFormRef}
            action="https://www.overleaf.com/docs"
            method="post"
            target="_blank"
            style={{ display: "none" }}
          >
            <input type="hidden" name="snip" value={latexSource} />
            <input type="hidden" name="snip_name" value={`ATS Resume — ${job?.company ?? "CustomJobFinder"}`} />
            <input type="hidden" name="engine" value="pdflatex" />
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["preview", "latex"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "latex" ? "LaTeX Source" : "Preview"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {tab === "preview" ? (
          <div className="space-y-5 text-sm text-gray-800">
            {/* Contact */}
            <div className="text-center pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{resumeData.contact.name}</h2>
              <p className="text-gray-500 mt-1 text-xs flex flex-wrap gap-2 justify-center">
                {[
                  resumeData.contact.phone,
                  resumeData.contact.email,
                  resumeData.contact.linkedin,
                  resumeData.contact.github,
                  resumeData.contact.location,
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <span key={i}>{item}</span>
                  ))}
              </p>
            </div>

            {/* Summary */}
            {resumeData.summary && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Summary</h3>
                <p className="text-gray-700 leading-relaxed">{resumeData.summary}</p>
              </div>
            )}

            {/* Skills */}
            {allSkills.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Technical Skills</h3>
                <div className="space-y-1">
                  {resumeData.skills.languages.length > 0 && (
                    <p><span className="font-semibold">Languages:</span> {resumeData.skills.languages.join(", ")}</p>
                  )}
                  {resumeData.skills.frameworks.length > 0 && (
                    <p><span className="font-semibold">Frameworks:</span> {resumeData.skills.frameworks.join(", ")}</p>
                  )}
                  {resumeData.skills.tools.length > 0 && (
                    <p><span className="font-semibold">Tools & Platforms:</span> {resumeData.skills.tools.join(", ")}</p>
                  )}
                  {resumeData.skills.databases.length > 0 && (
                    <p><span className="font-semibold">Databases:</span> {resumeData.skills.databases.join(", ")}</p>
                  )}
                  {resumeData.skills.other.length > 0 && (
                    <p><span className="font-semibold">Other:</span> {resumeData.skills.other.join(", ")}</p>
                  )}
                </div>
              </div>
            )}

            {/* Experience */}
            {resumeData.experience.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Experience</h3>
                <div className="space-y-4">
                  {resumeData.experience.map((exp, i) => (
                    <div key={i}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{exp.company}</p>
                          <p className="text-gray-600 italic">{exp.title} · {exp.location}</p>
                        </div>
                        <p className="text-gray-500 text-xs whitespace-nowrap">{exp.startDate} – {exp.endDate}</p>
                      </div>
                      <ul className="mt-1.5 ml-4 list-disc space-y-1 text-gray-700">
                        {exp.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {resumeData.education.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Education</h3>
                <div className="space-y-3">
                  {resumeData.education.map((edu, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{edu.school}</p>
                        <p className="text-gray-600 italic">
                          {edu.degree} in {edu.field}
                          {edu.gpa && ` · GPA: ${edu.gpa}`}
                        </p>
                        {edu.highlights.length > 0 && (
                          <ul className="mt-1 ml-4 list-disc text-gray-600 text-xs">
                            {edu.highlights.map((h, j) => <li key={j}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs whitespace-nowrap">{edu.startDate} – {edu.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {resumeData.projects.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Projects</h3>
                <div className="space-y-3">
                  {resumeData.projects.map((proj, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{proj.name}</span>
                        <span className="text-gray-500 text-xs italic">{proj.tech}</span>
                        {proj.link && (
                          <span className="text-blue-600 text-xs">{proj.link}</span>
                        )}
                      </div>
                      <ul className="mt-1 ml-4 list-disc space-y-1 text-gray-700">
                        {proj.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {resumeData.certifications.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Certifications</h3>
                <ul className="ml-4 list-disc space-y-1 text-gray-700">
                  {resumeData.certifications.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 overflow-auto text-xs leading-relaxed max-h-[500px] font-mono">
              {latexSource}
            </pre>
            <button
              onClick={copyLatex}
              className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2.5 py-1.5 rounded transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
        <svg className="w-3.5 h-3.5 text-[#4f9d69] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        Click <strong className="text-gray-700">Open in Overleaf</strong> to edit and compile to PDF for free. Or download the <strong className="text-gray-700">.tex</strong> file and compile locally.
      </div>
    </div>
  );
}
