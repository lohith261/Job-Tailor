import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

// Free public API — no key required
// Docs: https://jobicy.com/jobs-rss-feed
const JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs";
const REQUEST_TIMEOUT_MS = 15000;

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry?: string | string[];
  jobType?: string | string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
}

interface JobicyResponse {
  jobs?: JobicyJob[];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function mapJobLevel(raw?: string): string | undefined {
  if (!raw) return undefined;
  const level = normalize(raw);
  if (level.includes("intern")) return "intern";
  if (level.includes("junior") || level.includes("entry")) return "junior";
  if (level.includes("senior") || level.includes("sr")) return "senior";
  if (level.includes("lead") || level.includes("principal") || level.includes("staff")) return "lead";
  return "mid";
}

function mapJobicyJob(raw: JobicyJob): RawJob | null {
  if (!raw.jobTitle || !raw.companyName || !raw.url) return null;

  const description = raw.jobDescription
    ? stripHtml(raw.jobDescription).slice(0, 2500)
    : raw.jobExcerpt
    ? stripHtml(raw.jobExcerpt)
    : undefined;

  const industries = Array.isArray(raw.jobIndustry)
    ? raw.jobIndustry
    : raw.jobIndustry
    ? [raw.jobIndustry]
    : [];

  return {
    title: raw.jobTitle.trim(),
    company: raw.companyName.trim(),
    location: raw.jobGeo?.trim() || "Remote",
    locationType: "remote", // Jobicy is a remote-only board
    url: raw.url,
    source: "jobicy",
    description,
    salaryMin: raw.annualSalaryMin || undefined,
    salaryMax: raw.annualSalaryMax || undefined,
    salaryCurrency: raw.salaryCurrency || (raw.annualSalaryMin ? "USD" : undefined),
    experienceLevel: mapJobLevel(raw.jobLevel),
    industry: industries[0] || undefined,
    tags: industries.map(normalize),
    postedAt: raw.pubDate ? new Date(raw.pubDate) : undefined,
  };
}

function titleMatches(jobTitle: string, configTitles: string[]): boolean {
  if (configTitles.length === 0) return true;
  const jobWords = new Set(normalize(jobTitle).split(/\s+/));
  return configTitles.some((candidate) => {
    const candidateNorm = normalize(candidate);
    const jobNorm = normalize(jobTitle);
    if (jobNorm.includes(candidateNorm) || candidateNorm.includes(jobNorm)) return true;
    return candidateNorm.split(/\s+/).filter((w) => w.length > 2).some((w) => jobWords.has(w));
  });
}

function matchesConfig(job: RawJob, config: SearchConfigData): boolean {
  if (config.blacklistedCompanies.some((c) => normalize(c) === normalize(job.company))) {
    return false;
  }

  if (!titleMatches(job.title, config.titles)) return false;

  // Remote preferred globally; India jobs accept any location type
  if (!passesGeoFilter(job.location, job.locationType)) return false;

  if (config.experienceLevel && job.experienceLevel) {
    if (normalize(config.experienceLevel) !== normalize(job.experienceLevel)) return false;
  }

  const searchable = normalize(
    [job.title, job.description, ...(job.tags ?? [])].filter(Boolean).join(" ")
  );

  if (
    config.includeKeywords.length > 0 &&
    !config.includeKeywords.some((kw) => searchable.includes(normalize(kw)))
  ) {
    return false;
  }

  if (config.excludeKeywords.some((kw) => searchable.includes(normalize(kw)))) {
    return false;
  }

  return true;
}

function buildSearchTerms(config: SearchConfigData): string[] {
  const terms = new Set<string>();
  for (const title of config.titles.slice(0, 2)) terms.add(title);
  for (const kw of config.includeKeywords.slice(0, 2)) terms.add(kw);
  if (terms.size === 0) terms.add("");
  return Array.from(terms);
}

async function fetchJobs(url: string): Promise<JobicyResponse> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "JobTailor/1.0 (+https://github.com/lohith261/job-tailor)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Jobicy API returned ${res.status}`);
  return (await res.json()) as JobicyResponse;
}

export class JobicyScraper implements Scraper {
  name = "jobicy";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const seenIds = new Set<number>();
    const jobs: RawJob[] = [];

    const terms = buildSearchTerms(config);

    // Run all queries in parallel
    const results = await Promise.allSettled(
      terms.map((term) => {
        const params = new URLSearchParams({ count: "50" });
        if (term) params.set("search", term);
        return fetchJobs(`${JOBICY_API_URL}?${params.toString()}`);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const message = result.reason instanceof Error ? result.reason.message : "Unknown error";
        errors.push(`Jobicy "${terms[i] || "default"}" query failed: ${message}`);
        continue;
      }

      for (const item of result.value.jobs ?? []) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);

        const mapped = mapJobicyJob(item);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
