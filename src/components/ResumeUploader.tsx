"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface Props {
  onUpload: (file: File, name: string) => Promise<void>;
  onPasteText: (text: string, name: string) => Promise<void>;
  uploading?: boolean;
}

const ACCEPT_TYPES = [".pdf", ".docx", ".txt"];
const MAX_SIZE_MB = 10;
const MAX_PASTE_CHARS = 30000;

type Tab = "upload" | "paste";

export default function ResumeUploader({ onUpload, onPasteText, uploading = false }: Props) {
  const [tab, setTab] = useState<Tab>("upload");

  // Upload tab state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste tab state
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [pasteError, setPasteError] = useState("");

  // ── Upload tab helpers ──────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "docx", "txt"].includes(ext)) {
      return "Only PDF, DOCX, and TXT files are supported.";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be under ${MAX_SIZE_MB}MB.`;
    }
    return null;
  }

  function handleFileSelect(file: File) {
    const err = validateFile(file);
    if (err) {
      setUploadError(err);
      setSelectedFile(null);
      return;
    }
    setUploadError("");
    setSelectedFile(file);
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadError("");
    try {
      await onUpload(selectedFile, uploadName);
      setSelectedFile(null);
      setUploadName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Upload failed. Please try again.");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function getFormatIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "📄";
    if (ext === "docx") return "📝";
    return "📃";
  }

  // ── Paste tab helpers ───────────────────────────────────────────────────────

  async function handlePasteSubmit() {
    setPasteError("");
    if (pasteText.trim().length < 50) {
      setPasteError("Please paste at least 50 characters of resume content.");
      return;
    }
    if (!pasteName.trim()) {
      setPasteError("Resume name is required.");
      return;
    }
    try {
      await onPasteText(pasteText, pasteName.trim());
      setPasteText("");
      setPasteName("");
    } catch {
      setPasteError("Submission failed. Please try again.");
    }
  }

  const charCount = pasteText.length;
  const charCountColor =
    charCount > MAX_PASTE_CHARS * 0.9
      ? "text-red-500"
      : charCount > MAX_PASTE_CHARS * 0.7
      ? "text-amber-500"
      : "text-gray-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Resume</h2>

      {/* Tab toggle */}
      <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-gray-50 dark:bg-gray-700 mb-5">
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "upload"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload PDF
        </button>
        <button
          onClick={() => setTab("paste")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "paste"
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Paste Text
        </button>
      </div>

      {/* ── Upload tab ──────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${
                dragOver
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : selectedFile
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20 cursor-default"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES.join(",")}
              onChange={onFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{getFormatIcon(selectedFile.name)}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setUploadName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">📎</div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Drop your resume here</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  PDF, DOCX, or TXT · max {MAX_SIZE_MB}MB
                </p>
              </>
            )}
          </div>

          {uploadError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {uploadError}
            </p>
          )}

          {selectedFile && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resume name
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Senior Engineer Resume 2025"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !uploadName.trim()}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Uploading & parsing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Upload Resume
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Paste text tab ──────────────────────────────────────────────────── */}
      {tab === "paste" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resume name
            </label>
            <input
              type="text"
              value={pasteName}
              onChange={(e) => setPasteName(e.target.value)}
              placeholder="e.g. Senior Engineer Resume 2025"
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resume content
            </label>
            <div className="relative">
              <textarea
                value={pasteText}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_PASTE_CHARS) {
                    setPasteText(e.target.value);
                  }
                }}
                placeholder="Paste your resume text here…"
                rows={10}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y placeholder-gray-400 dark:placeholder-gray-500"
                style={{ minHeight: "200px" }}
              />
              <span
                className={`absolute bottom-2 right-2 text-xs pointer-events-none ${charCountColor}`}
              >
                {charCount.toLocaleString()} / {MAX_PASTE_CHARS.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Plain text only. Formatting will be stripped.
            </p>
          </div>

          {pasteError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {pasteError}
            </p>
          )}

          <button
            onClick={handlePasteSubmit}
            disabled={uploading || pasteText.trim().length < 50 || !pasteName.trim()}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save Resume
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
