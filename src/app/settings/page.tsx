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
  yearsOfExperience: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  companySize: string;
  industries: string[];
  skills: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  blacklistedCompanies: string[];
  preferredCompanies: string[];
  jobType: string;
}

const defaultConfig: ConfigData = {
  titles: [],
  locations: [],
  locationType: "any",
  experienceLevel: "",
  yearsOfExperience: null,
  salaryMin: null,
  salaryMax: null,
  currency: "INR",
  companySize: "",
  industries: [],
  skills: [],
  includeKeywords: [],
  excludeKeywords: [],
  blacklistedCompanies: [],
  preferredCompanies: [],
  jobType: "full-time",
};

const JOB_TITLE_SUGGESTIONS = [
  "Software Engineer", "Frontend Developer", "Backend Developer",
  "Full Stack Developer", "Data Scientist", "Product Manager",
  "DevOps Engineer", "Machine Learning Engineer", "UI/UX Designer",
  "Data Analyst", "Android Developer", "iOS Developer", "SRE",
];

const LOCATION_SUGGESTIONS = [
  "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Remote",
];

const SKILLS_SUGGESTIONS = [
  "React", "TypeScript", "JavaScript", "Node.js", "Python",
  "Java", "Go", "Rust", "AWS", "GCP", "Azure", "Docker",
  "Kubernetes", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
  "Next.js", "Flutter", "Swift", "Kotlin", "Spring Boot",
  "Django", "FastAPI", "TensorFlow", "PyTorch", "SQL",
];

interface SalaryErrors {
  salaryMin?: string;
  salaryMax?: string;
}

function validateSalary(salaryMin: number | null, salaryMax: number | null): SalaryErrors {
  const errors: SalaryErrors = {};
  if (salaryMin !== null && salaryMin < 0) errors.salaryMin = "Must be a positive number.";
  if (salaryMax !== null && salaryMax < 0) errors.salaryMax = "Must be a positive number.";
  if (salaryMin !== null && salaryMax !== null && !errors.salaryMin && !errors.salaryMax) {
    if (salaryMin >= salaryMax) errors.salaryMin = "Min must be less than max.";
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
          jobType: data.jobType ?? "full-time",
          currency: data.currency ?? "INR",
          salaryMin: data.salaryMin ?? null,
          salaryMax: data.salaryMax ?? null,
          yearsOfExperience: data.yearsOfExperience ?? null,
          skills: data.skills ?? [],
          preferredCompanies: data.preferredCompanies ?? [],
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
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The more you fill in, the more accurate your job matches will be.{" "}
            <Link href="/profile" className="text-brand-600 dark:text-brand-400 hover:underline">
              Update your profile
            </Link>{" "}
            for contact info.
          </p>
        </div>
        <SaveButton saved={saved} saving={saving} hasErrors={Object.keys(salaryErrors).length > 0} onSave={handleSave} />
      </div>

      <div className="space-y-5">

        {/* Job Titles */}
        <Section title="Job Titles" description="Roles you're targeting — used directly in search queries">
          <TagInput
            tags={config.titles}
            onChange={(titles) => setConfig({ ...config, titles })}
            placeholder="e.g., Software Engineer, Frontend Developer..."
            suggestions={JOB_TITLE_SUGGESTIONS}
            datalistId="job-title-suggestions"
          />
        </Section>

        {/* Skills */}
        <Section
          title="Skills & Tech Stack"
          description="Technologies you know — weighted heavily in scoring and passed to scrapers"
          highlight
        >
          <TagInput
            tags={config.skills}
            onChange={(skills) => setConfig({ ...config, skills })}
            placeholder="e.g., React, Python, AWS, Docker..."
            suggestions={SKILLS_SUGGESTIONS}
            datalistId="skills-suggestions"
          />
          <p className="mt-2 text-xs text-brand-600 dark:text-brand-400">
            Skills account for 20% of your match score. Add everything you are comfortable with.
          </p>
        </Section>

        {/* Location */}
        <Section title="Location Preferences" description="Where you want to work">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["any", "remote", "hybrid", "onsite"].map((type) => (
                <button
                  key={type}
                  onClick={() => setConfig({ ...config, locationType: type })}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    config.locationType === type
                      ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700"
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

        {/* Job Type */}
        <Section title="Job Type" description="Type of employment you are looking for">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "full-time", label: "Full-time" },
              { value: "part-time", label: "Part-time" },
              { value: "contract", label: "Contract / Freelance" },
              { value: "internship", label: "Internship" },
              { value: "any", label: "Any" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfig({ ...config, jobType: value })}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  config.jobType === value
                    ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Experience */}
        <Section title="Experience" description="Your experience level and years">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Level</label>
              <select
                value={config.experienceLevel ?? ""}
                onChange={(e) => setConfig({ ...config, experienceLevel: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-brand-300 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              >
                <option value="">Any Level</option>
                <option value="intern">Intern</option>
                <option value="junior">Junior (0–2 yrs)</option>
                <option value="mid">Mid-Level (2–5 yrs)</option>
                <option value="senior">Senior (5–10 yrs)</option>
                <option value="lead">Lead / Staff</option>
                <option value="principal">Principal / Director</option>
              </select>
            </div>
            <div className="w-40">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Years of Experience</label>
              <input
                type="number"
                min={0}
                max={40}
                placeholder="e.g., 4"
                value={config.yearsOfExperience ?? ""}
                onChange={(e) => setConfig({ ...config, yearsOfExperience: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-brand-300 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              />
            </div>
          </div>
        </Section>

        {/* Salary */}
        <Section title="Salary Range" description="Your expected compensation">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Currency</span>
            <div className="flex gap-2">
              {["INR", "USD", "GBP"].map((c) => (
                <button
                  key={c}
                  onClick={() => setConfig({ ...config, currency: c })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    config.currency === c
                      ? "bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                Minimum {config.currency === "INR" ? "(₹ per year)" : "(annual)"}
              </label>
              <input
                type="number"
                min={0}
                placeholder={config.currency === "INR" ? "e.g., 800000" : "e.g., 60000"}
                value={config.salaryMin ?? ""}
                onChange={(e) => {
                  const newMin = e.target.value ? parseInt(e.target.value) : null;
                  setConfig({ ...config, salaryMin: newMin });
                  setSalaryErrors(validateSalary(newMin, config.salaryMax));
                }}
                className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 ${
                  salaryErrors.salaryMin ? "border-red-400" : "border-gray-200 dark:border-gray-600 focus:border-brand-300 dark:focus:border-brand-500"
                }`}
              />
              {salaryErrors.salaryMin && <p className="mt-1 text-xs text-red-600">{salaryErrors.salaryMin}</p>}
            </div>
            <span className="text-gray-400 dark:text-gray-500 mt-9">to</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Maximum</label>
              <input
                type="number"
                min={0}
                placeholder={config.currency === "INR" ? "e.g., 2000000" : "e.g., 120000"}
                value={config.salaryMax ?? ""}
                onChange={(e) => {
                  const newMax = e.target.value ? parseInt(e.target.value) : null;
                  setConfig({ ...config, salaryMax: newMax });
                  setSalaryErrors(validateSalary(config.salaryMin, newMax));
                }}
                className={`w-full rounded-lg border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 ${
                  salaryErrors.salaryMax ? "border-red-400" : "border-gray-200 dark:border-gray-600 focus:border-brand-300 dark:focus:border-brand-500"
                }`}
              />
              {salaryErrors.salaryMax && <p className="mt-1 text-xs text-red-600">{salaryErrors.salaryMax}</p>}
            </div>
          </div>
        </Section>

        {/* Company */}
        <Section title="Company Preferences" description="Target or avoid specific companies and sizes">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                Preferred Companies <span className="text-brand-500 font-normal">(get a score boost)</span>
              </label>
              <TagInput
                tags={config.preferredCompanies}
                onChange={(preferredCompanies) => setConfig({ ...config, preferredCompanies })}
                placeholder="e.g., Google, Zepto, Razorpay..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Company Size</label>
              <select
                value={config.companySize ?? ""}
                onChange={(e) => setConfig({ ...config, companySize: e.target.value })}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:border-brand-300 dark:focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
              >
                <option value="">Any Size</option>
                <option value="startup">Startup (1–50)</option>
                <option value="small">Small (50–200)</option>
                <option value="medium">Medium (200–1000)</option>
                <option value="large">Large (1000–10000)</option>
                <option value="enterprise">Enterprise (10000+)</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Industries */}
        <Section title="Industries" description="Sectors you are interested in">
          <TagInput
            tags={config.industries}
            onChange={(industries) => setConfig({ ...config, industries })}
            placeholder="e.g., Fintech, Healthcare, SaaS..."
          />
        </Section>

        {/* Include Keywords */}
        <Section title="Include Keywords" description="Additional terms that should appear in job descriptions">
          <TagInput
            tags={config.includeKeywords}
            onChange={(includeKeywords) => setConfig({ ...config, includeKeywords })}
            placeholder="e.g., microservices, startup, equity..."
          />
        </Section>

        {/* Advanced */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Exclude keywords and blacklist companies</p>
            </div>
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Exclude Keywords</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filter out jobs containing these terms</p>
                <TagInput
                  tags={config.excludeKeywords}
                  onChange={(excludeKeywords) => setConfig({ ...config, excludeKeywords })}
                  placeholder="e.g., PHP, WordPress, security clearance..."
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Blacklisted Companies</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">These companies will always score 0</p>
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
        <SaveButton saved={saved} saving={saving} hasErrors={Object.keys(salaryErrors).length > 0} onSave={handleSave} />
      </div>
    </div>
  );
}

function SaveButton({ saved, saving, hasErrors, onSave }: {
  saved: boolean; saving: boolean; hasErrors: boolean; onSave: () => void;
}) {
  return (
    <button
      onClick={onSave}
      disabled={saving || hasErrors}
      className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors ${
        saved ? "bg-emerald-600" : "bg-brand-600 hover:bg-brand-700 disabled:opacity-50"
      }`}
    >
      {saved ? "Saved!" : saving ? "Saving..." : "Save Configuration"}
    </button>
  );
}

function Section({ title, description, children, highlight }: {
  title: string; description: string; children: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${
      highlight
        ? "border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/10"
        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    }`}>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      {children}
    </div>
  );
}
