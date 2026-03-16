import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

// Free public API — no key required
// Docs: https://www.arbeitnow.com/api
const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
const REQUEST_TIMEOUT_MS = 15000;

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number; // Unix timestamp
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links?: { next?: string };
  meta?: { current_page: number; last_page: number };
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

function inferExperienceLevel(title: string, description: string): string | undefined {
  const text = normalize(title + " " + description.slice(0, 500));
  if (text.includes("intern")) return "intern";
  if (text.includes("junior") || text.includes("entry level") || text.includes("jr ")) return "junior";
  if (text.includes("principal") || text.includes("staff engineer")) return "lead";
  if (text.includes("lead ") || text.includes("tech lead")) return "lead";
  if (text.includes("senior") || text.includes("sr ") || text.includes("sr.")) return "senior";
  return "mid";
}

function inferLocationType(job: ArbeitnowJob): string {
  if (job.remote) return "remote";
  const types = (job.job_types ?? []).map(normalize);
  if (types.includes("hybrid")) return "hybrid";
  if (types.some((t) => t.includes("remote"))) return "remote";
  return "onsite";
}

function mapArbeitnowJob(raw: ArbeitnowJob): RawJob | null {
  if (!raw.title || !raw.company_name || !raw.url) return null;

  const descriptionText = raw.description ? stripHtml(raw.description).slice(0, 2500) : undefined;

  return {
    title: raw.title.trim(),
    company: raw.company_name.trim(),
    location: raw.location?.trim() || (raw.remote ? "Remote" : ""),
    locationType: inferLocationType(raw),
    url: raw.url,
    source: "arbeitnow",
    description: descriptionText,
    experienceLevel: inferExperienceLevel(raw.title, raw.description ?? ""),
    tags: (raw.tags ?? []).map((t) => normalize(t)),
    postedAt: raw.created_at ? new Date(raw.created_at * 1000) : undefined,
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

async function fetchPage(page: number): Promise<ArbeitnowResponse> {
  const url = `${ARBEITNOW_API_URL}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CustomJobFinder/1.0 (+https://github.com/lohith261/CustomJobFinder)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`Arbeitnow API returned ${res.status}`);
  return (await res.json()) as ArbeitnowResponse;
}

export class ArbeitnowScraper implements Scraper {
  name = "arbeitnow";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const jobs: RawJob[] = [];
    const seenSlugs = new Set<string>();

    // Fetch first 3 pages in parallel (each page has ~100 jobs = 300 candidates)
    const pages = [1, 2, 3];
    const results = await Promise.allSettled(pages.map((p) => fetchPage(p)));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const message = result.reason instanceof Error ? result.reason.message : "Unknown error";
        errors.push(`Arbeitnow page ${pages[i]} failed: ${message}`);
        continue;
      }

      for (const item of result.value.data ?? []) {
        if (seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);

        const mapped = mapArbeitnowJob(item);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
