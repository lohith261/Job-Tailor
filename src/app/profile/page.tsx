"use client";

import { useState, useEffect, useRef } from "react";

interface Profile {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  location: string;
}

const empty: Profile = { name: "", email: "", phone: "", linkedin: "", github: "", location: "" };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [mode, setMode] = useState<"upload" | "form">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile({ name: data.name ?? "", email: data.email ?? "", phone: data.phone ?? "", linkedin: data.linkedin ?? "", github: data.github ?? "", location: data.location ?? "" });
        // If profile already has data, show the form
        if (data.name || data.email) setMode("form");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleExtract(file: File) {
    setExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile", { method: "POST", body: form });
      if (!res.ok) throw new Error("Extraction failed");
      const data = await res.json();
      setProfile((prev) => ({
        name: data.name || prev.name,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        linkedin: data.linkedin || prev.linkedin,
        github: data.github || prev.github,
        location: data.location || prev.location,
      }));
      setMode("form");
      showToast("Contact info extracted — review and save below");
    } catch {
      showToast("Could not extract info. Please fill the form manually.", "error");
      setMode("form");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast("Profile saved!");
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? "✓" : "✗"} {toast.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          This contact info is used in generated ATS resumes and cold outreach emails.
        </p>
      </div>

      {mode === "upload" && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-10 text-center">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload your resume to auto-fill</h2>
          <p className="text-sm text-gray-500 mb-6">
            We'll extract your name, email, phone, LinkedIn, GitHub, and location automatically.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {extracting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Extracting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Resume (PDF)
                </>
              )}
            </button>
            <button
              onClick={() => setMode("form")}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              I don't have a resume — fill manually
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleExtract(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {mode === "form" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact Information</h2>
            <button
              onClick={() => setMode("upload")}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Re-upload resume
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <Field label="Full Name" placeholder="e.g., Jane Smith" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" placeholder="jane@example.com" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} type="email" />
              <Field label="Phone" placeholder="+1 (555) 000-0000" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} type="tel" />
            </div>
            <Field label="Location" placeholder="City, Country" value={profile.location} onChange={(v) => setProfile({ ...profile, location: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="LinkedIn URL" placeholder="linkedin.com/in/username" value={profile.linkedin} onChange={(v) => setProfile({ ...profile, linkedin: v })} />
              <Field label="GitHub URL" placeholder="github.com/username" value={profile.github} onChange={(v) => setProfile({ ...profile, github: v })} />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors ${saved ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"}`}
            >
              {saved ? "Saved!" : saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, placeholder, value, onChange, type = "text" }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
      />
    </div>
  );
}
