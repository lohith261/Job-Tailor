// Naukri.com scraper — uses Naukri's internal JSON API via scrape.do proxy.
// Auto-disables when SCRAPE_DO_TOKEN is not set.

import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";
import { scrapeDOFetch, isScrapeDOEnabled } from "./scrape-do";

const NAUKRI_API_BASE = "https://www.naukri.com/jobapi/v3/search";
const REQUEST_TIMEOUT_MS = 30000; // scrape.do adds overhead

// ─── Naukri API Types ─────────────────────────────────────────────────────────

interface NaukriPlaceholder {
  label: string;
  label2?: string;
}

interface NaukriJob {
  jobId: string;
  title: string;
  companyName: string;
  placeholders: NaukriPlaceholder[];
  jobDescription: string;
  jdURL: string;
  salary?: string;
  experienceText?: string;
  postedDate?: string; // epoch ms as string
  tagsAndSkills?: string;
  jobType?: string; // "Full Time" | "Part Time" | "Contract"
  workMode?: string; // "Work from Home" | "Hybrid" | "Work from Office"
}

interface NaukriResponse {
  jobDetails: NaukriJob[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function inferLocationType(workMode?: string): string {
  if (!workMode) return "onsite";
  const wm = workMode.toLowerCase();
  if (wm.includes("home")) return "remote";
  if (wm.includes("hybrid")) return "hybrid";
  return "onsite";
}

function inferExperienceLevel(title: string, description: string, experienceText?: string): string | undefined {
  const text = normalize([title, description.slice(0, 500), experienceText ?? ""].join(" "));
  if (text.includes("intern")) return "intern";
  if (text.includes("fresher") || text.includes("entry level") || text.includes("0-1") || text.includes("0 - 1")) return "junior";
  if (text.includes("junior") || text.includes("jr ") || text.includes("entry")) return "junior";
  if (text.includes("principal") || text.includes("staff engineer")) return "lead";
  if (text.includes("lead ") || text.includes("tech lead")) return "lead";
  if (text.includes("senior") || text.includes("sr ") || text.includes("sr.")) return "senior";
  return "mid";
}

/**
 * Parse INR salary strings from Naukri format.
 * Examples: "3-5 Lacs PA", "10-15 Lacs PA", "50000-70000 PA", "Not Disclosed"
 */
function parseSalaryINR(salaryText?: string): { min?: number; max?: number } {
  if (!salaryText || /not\s+disclosed/i.test(salaryText)) return {};

  // "3-5 Lacs PA" or "3.5-5 Lacs PA"
  const lacsRange = salaryText.match(/([\d.]+)\s*[-–]\s*([\d.]+)\s*lac/i);
  if (lacsRange) {
    return {
      min: Math.round(parseFloat(lacsRange[1]) * 100000),
      max: Math.round(parseFloat(lacsRange[2]) * 100000),
    };
  }

  // "10 Lacs PA" (single value)
  const lacsSingle = salaryText.match(/([\d.]+)\s*lac/i);
  if (lacsSingle) {
    const val = Math.round(parseFloat(lacsSingle[1]) * 100000);
    return { min: val, max: val };
  }

  // Plain number ranges (annual)
  const numRange = salaryText.match(/([\d,]+)\s*[-–]\s*([\d,]+)/);
  if (numRange) {
    const a = parseInt(numRange[1].replace(/,/g, ""), 10);
    const b = parseInt(numRange[2].replace(/,/g, ""), 10);
    return { min: a, max: b };
  }

  return {};
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapNaukriJob(raw: NaukriJob): RawJob | null {
  if (!raw.title || !raw.companyName || !raw.jdURL) return null;

  // Extract location from placeholders (first placeholder with label is usually location)
  const locationPlaceholder = raw.placeholders?.find((p) => p.label);
  const location = locationPlaceholder?.label ?? "India";

  const locationType = inferLocationType(raw.workMode);
  const description = raw.jobDescription ?? "";
  const experienceLevel = inferExperienceLevel(raw.title, description, raw.experienceText);

  const salary = parseSalaryINR(raw.salary);

  let postedAt: Date | undefined;
  if (raw.postedDate) {
    const epochMs = parseInt(raw.postedDate, 10);
    if (!isNaN(epochMs) && epochMs > 0) {
      postedAt = new Date(epochMs);
    }
  }

  const tags = raw.tagsAndSkills
    ? raw.tagsAndSkills
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : undefined;

  return {
    title: raw.title.trim(),
    company: raw.companyName.trim(),
    location: location.trim() || "India",
    locationType,
    url: `https://www.naukri.com${raw.jdURL}`,
    source: "naukri",
    description: description.slice(0, 2500),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.min || salary.max ? "INR" : undefined,
    experienceLevel,
    tags,
    postedAt,
  };
}

// ─── Config matching ──────────────────────────────────────────────────────────

function titleMatches(jobTitle: string, configTitles: string[]): boolean {
  if (configTitles.length === 0) return true;
  const jobNorm = normalize(jobTitle);
  const jobWords = new Set(jobNorm.split(/\s+/));
  return configTitles.some((candidate) => {
    const cn = normalize(candidate);
    if (jobNorm.includes(cn) || cn.includes(jobNorm)) return true;
    return cn.split(/\s+/).filter((w) => w.length > 2).some((w) => jobWords.has(w));
  });
}

function matchesConfig(job: RawJob, config: SearchConfigData): boolean {
  if (config.blacklistedCompanies.some((c) => normalize(c) === normalize(job.company))) return false;
  if (!titleMatches(job.title, config.titles)) return false;
  if (!passesGeoFilter(job.location, job.locationType)) return false;

  if (config.experienceLevel && job.experienceLevel) {
    if (normalize(config.experienceLevel) !== normalize(job.experienceLevel)) return false;
  }

  if (config.salaryMin && job.salaryMax && job.salaryMax < config.salaryMin) return false;
  if (config.salaryMax && job.salaryMin && job.salaryMin > config.salaryMax) return false;

  const searchable = normalize(
    [job.title, job.description, ...(job.tags ?? [])].filter(Boolean).join(" ")
  );
  if (
    config.includeKeywords.length > 0 &&
    !config.includeKeywords.some((kw) => searchable.includes(normalize(kw)))
  ) {
    return false;
  }
  if (config.excludeKeywords.some((kw) => searchable.includes(normalize(kw)))) return false;

  return true;
}

// ─── Fetching ─────────────────────────────────────────────────────────────────

async function fetchNaukriJobs(keyword: string): Promise<NaukriJob[]> {
  const params = new URLSearchParams({
    noOfResults: "20",
    urlType: "search_by_key_loc",
    searchType: "adv",
    keyword,
    pageNo: "1",
  });

  const apiUrl = `${NAUKRI_API_BASE}?${params.toString()}`;
  console.log(`[NaukriScraper] Fetching: ${apiUrl}`);

  const rawText = await scrapeDOFetch(apiUrl, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    geoCode: "in",
    extraHeaders: {
      appid: "109",
      systemid: "109",
      "Content-Type": "application/json",
    },
  });

  let data: NaukriResponse;
  try {
    data = JSON.parse(rawText) as NaukriResponse;
  } catch {
    throw new Error(`Naukri returned non-JSON response for keyword "${keyword}": ${rawText.slice(0, 200)}`);
  }

  return data.jobDetails ?? [];
}

// ─── Scraper class ────────────────────────────────────────────────────────────

export class NaukriScraper implements Scraper {
  name = "naukri";
  enabled: boolean;

  constructor() {
    // Auto-disable if scrape.do proxy is not configured (Naukri blocks direct server requests)
    this.enabled = isScrapeDOEnabled();
  }

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();

    if (!this.enabled) {
      return { jobs: [], errors: [], source: this.name, durationMs: Date.now() - start };
    }

    const errors: string[] = [];
    const jobs: RawJob[] = [];
    const seenIds = new Set<string>();

    // Search up to 3 titles in parallel, max 20 results each
    // Also add top 2 skills as additional search queries if distinct from titles
    const titlesToSearch = config.titles.slice(0, 3);
    if (titlesToSearch.length === 0) {
      titlesToSearch.push("software developer");
    }
    const skillQueries = (config.skills ?? [])
      .slice(0, 2)
      .filter((s) => !titlesToSearch.some((t) => t.toLowerCase().includes(s.toLowerCase())));
    const allQueries = [...titlesToSearch, ...skillQueries];

    const results = await Promise.allSettled(
      allQueries.map((title) => fetchNaukriJobs(title))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const keyword = allQueries[i];

      if (result.status === "rejected") {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`Naukri fetch failed for "${keyword}": ${msg}`);
        continue;
      }

      for (const rawJob of result.value) {
        if (!rawJob.jobId || seenIds.has(rawJob.jobId)) continue;
        seenIds.add(rawJob.jobId);

        const mapped = mapNaukriJob(rawJob);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
