"use client";

import { useState, useEffect } from "react";
import { TagInput } from "@/components/TagInput";
import Link from "next/link";

interface ConfigData {
  id?: string;
  titles: string[];
  locations: string[];
  locationType: string;
  experienceLevel: string;
  salaryMin: number | null;
  salaryMax: number | null;
  companySize: string;
  industries: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  blacklistedCompanies: string[];
}

const defaultConfig: ConfigData = {
  titles: [],
  locations: [],
  locationType: "any",
  experienceLevel: "",
  salaryMin: null,
  salaryMax: null,
  companySize: "",
  industries: [],
  includeKeywords: [],
  excludeKeywords: [],
  blacklistedCompanies: [],
};

const JOB_TITLE_SUGGESTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Product Manager",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "UI/UX Designer",
  "Data Analyst",
];

const LOCATION_SUGGESTIONS = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Remote",
];

interface SalaryErrors {
  salaryMin?: string;
  salaryMax?: string;
}

function validateSalary(
  salaryMin: number | null,
  salaryMax: number | null
): SalaryErrors {
  const errors: SalaryErrors = {};
  if (salaryMin !== null) {
    if (salaryMin < 0) errors.salaryMin = "Minimum salary must be a positive number.";
  }
  if (salaryMax !== null) {
    if (salaryMax < 0) errors.salaryMax = "Maximum salary must be a positive number.";
  }
  if (salaryMin !== null && salaryMax !== null && !errors.salaryMin && !errors.salaryMax) {
    if (salaryMin >= salaryMax) errors.salaryMin = "Minimum salary must be less than maximum salary.";
  }
  return errors;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigData>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [salaryErrors, setSalaryErrors] = useState<SalaryErrors>({});

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          ...defaultConfig,
          ...data,
          experienceLevel: data.experienceLevel ?? "",
          companySize: data.companySize ?? "",
          locationType: data.locationType ?? "any",
          salaryMin: data.salaryMin ?? null,
          salaryMax: data.salaryMax ?? null,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const errors = validateSalary(config.salaryMin, config.salaryMax);
    setSalaryErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Search Configuration
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure your job search criteria.{" "}
            <Link href="/profile" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Update your profile
            </Link>{" "}
            to set your contact info.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(salaryErrors).length > 0}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
            saved
              ? "bg-emerald-600"
              : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          }`}
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>

      <div className="space-y-8">
        <Section title="Job Titles" description="Add the job titles you're interested in">
          <TagInput
            tags={config.titles}
            onChange={(titles) => setConfig({ ...config, titles })}
            placeholder="e.g., Software Engineer, Frontend Developer..."
            suggestions={JOB_TITLE_SUGGESTIONS}
            datalistId="job-title-suggestions"
          />
        </Section>

        <Section title="Location Preferences" description="Set your location and work type preferences">
          <div className="space-y-3">
            <div className="flex gap-2">
              {["any", "remote", "hybrid", "onsite"].map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig({ ...config, locationType: type })}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    config.locationType === type
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <TagInput
              tags={config.locations}
              onChange={(locations) => setConfig({ ...config, locations })}
              placeholder="e.g., Bangalore, Mumbai, Remote..."
              suggestions={LOCATION_SUGGESTIONS}
              datalistId="location-suggestions"
            />
          </div>
        </Section>

        <Section title="Experience Level" description="Select your experience level">
          <select
            value={config.experienceLevel ?? ""}
            onChange={(e) =>
              setConfig({ ...config, experienceLevel: e.target.value })
            }
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-300 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          >
            <option value="">Any Level</option>
            <option value="intern">Intern</option>
            <option value="junior">Junior (0-2 years)</option>
            <option value="mid">Mid-Level (2-5 years)</option>
            <option value="senior">Senior (5-10 years)</option>
            <option value="lead">Lead / Staff</option>
            <option value="principal">Principal / Director</option>
          </select>
        </Section>

        <Section title="Salary Range" description="Set your desired salary range (annual, in ₹ LPA or USD)">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Minimum</label>
              <input
                type="number"
                min={0}
                placeholder="e.g., 800000"
                value={config.salaryMin ?? ""}
                onChange={(e) => {
                  const newMin = e.target.value ? parseInt(e.target.value) : null;
                  const updated = { ...config, salaryMin: newMin };
                  setConfig(updated);
                  setSalaryErrors(validateSalary(newMin, updated.salaryMax));
                }}
                className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 ${
                  salaryErrors.salaryMin
                    ? "border-red-400 focus:border-red-400"
                    : "border-gray-200 dark:border-gray-600 focus:border-indigo-300 dark:focus:border-indigo-500"
                }`}
              />
              {salaryErrors.salaryMin && (
                <p className="mt-1 text-xs text-red-600">{salaryErrors.salaryMin}</p>
              )}
            </div>
            <span className="text-gray-400 dark:text-gray-500 mt-9">to</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Maximum</label>
              <input
                type="number"
                min={0}
                placeholder="e.g., 2000000"
                value={config.salaryMax ?? ""}
                onChange={(e) => {
                  const newMax = e.target.value ? parseInt(e.target.value) : null;
                  const updated = { ...config, salaryMax: newMax };
                  setConfig(updated);
                  setSalaryErrors(validateSalary(updated.salaryMin, newMax));
                }}
                className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 ${
                  salaryErrors.salaryMax
                    ? "border-red-400 focus:border-red-400"
                    : "border-gray-200 dark:border-gray-600 focus:border-indigo-300 dark:focus:border-indigo-500"
                }`}
              />
              {salaryErrors.salaryMax && (
                <p className="mt-1 text-xs text-red-600">{salaryErrors.salaryMax}</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="Company Size" description="Preferred company size">
          <select
            value={config.companySize ?? ""}
            onChange={(e) =>
              setConfig({ ...config, companySize: e.target.value })
            }
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-indigo-300 dark:focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900"
          >
            <option value="">Any Size</option>
            <option value="startup">Startup (1-50)</option>
            <option value="small">Small (50-200)</option>
            <option value="medium">Medium (200-1000)</option>
            <option value="large">Large (1000-10000)</option>
            <option value="enterprise">Enterprise (10000+)</option>
          </select>
        </Section>

        <Section title="Industries" description="Industries you're interested in">
          <TagInput
            tags={config.industries}
            onChange={(industries) => setConfig({ ...config, industries })}
            placeholder="e.g., Fintech, Healthcare, SaaS..."
          />
        </Section>

        <Section title="Include Keywords" description="Keywords that should appear in job descriptions">
          <TagInput
            tags={config.includeKeywords}
            onChange={(includeKeywords) =>
              setConfig({ ...config, includeKeywords })
            }
            placeholder="e.g., React, TypeScript, Node.js..."
          />
        </Section>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Exclude keywords and blacklist companies — optional</p>
            </div>
            <svg
              className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Exclude Keywords</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Keywords to filter out from results</p>
                <TagInput
                  tags={config.excludeKeywords}
                  onChange={(excludeKeywords) => setConfig({ ...config, excludeKeywords })}
                  placeholder="e.g., PHP, WordPress, Clearance required..."
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Blacklisted Companies</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Companies you want to exclude from results</p>
                <TagInput
                  tags={config.blacklistedCompanies}
                  onChange={(blacklistedCompanies) => setConfig({ ...config, blacklistedCompanies })}
                  placeholder="Add company names to exclude..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || Object.keys(salaryErrors).length > 0}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
            saved
              ? "bg-emerald-600"
              : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          }`}
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      {children}
    </div>
  );
}
