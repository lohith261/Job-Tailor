import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

// Free API — register at https://developer.adzuna.com to get your app_id and app_key
// Set ADZUNA_APP_ID and ADZUNA_API_KEY in .env. Scraper disables itself if either is missing.
const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const REQUEST_TIMEOUT_MS = 15000;

// Country codes to search. Adzuna covers: us, gb, au, ca, in, de, fr, nl, sg, nz, at, be, br, mx, pl, ru, za
const SEARCH_COUNTRIES = ["us", "gb", "in", "au", "ca"];

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  category: { label: string; tag: string };
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  contract_type?: string;
  contract_time?: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
  mean: number;
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

function inferLocationType(job: AdzunaJob): string {
  const text = normalize([job.title, job.description, job.location.display_name].join(" "));
  if (text.includes("remote") || text.includes("work from home") || text.includes("wfh")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  return "onsite";
}

function mapAdzunaJob(raw: AdzunaJob, country: string): RawJob | null {
  if (!raw.title || !raw.company?.display_name || !raw.redirect_url) return null;

  const description = raw.description ? stripHtml(raw.description).slice(0, 2500) : undefined;
  const locationType = inferLocationType(raw);

  return {
    title: raw.title.trim(),
    company: raw.company.display_name.trim(),
    location: raw.location.display_name.trim() || country.toUpperCase(),
    locationType,
    url: raw.redirect_url,
    source: "adzuna",
    description,
    salaryMin: raw.salary_min ? Math.round(raw.salary_min) : undefined,
    salaryMax: raw.salary_max ? Math.round(raw.salary_max) : undefined,
    salaryCurrency: country === "gb" ? "GBP" : country === "au" ? "AUD" : country === "ca" ? "CAD" : "USD",
    experienceLevel: inferExperienceLevel(raw.title, raw.description ?? ""),
    tags: [raw.category.tag].filter(Boolean).map(normalize),
    postedAt: raw.created ? new Date(raw.created) : undefined,
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

  if (config.excludeKeywords.some((kw) => searchable.includes(normalize(kw)))) {
    return false;
  }

  return true;
}

async function searchCountry(
  country: string,
  query: string,
  appId: string,
  appKey: string
): Promise<AdzunaResponse> {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    results_per_page: "50",
    "content-type": "application/json",
  });
  const url = `${ADZUNA_BASE_URL}/${country}/search/1?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "JobTailor/1.0 (+https://github.com/lohith261/job-tailor)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Adzuna ${country.toUpperCase()} returned ${res.status}: ${body.slice(0, 100)}`);
  }
  return (await res.json()) as AdzunaResponse;
}

export class AdzunaScraper implements Scraper {
  name = "adzuna";
  enabled: boolean;

  private appId: string;
  private appKey: string;

  constructor() {
    this.appId = process.env.ADZUNA_APP_ID ?? "";
    this.appKey = process.env.ADZUNA_API_KEY ?? "";
    // Only enable if both credentials are present
    this.enabled = !!(this.appId && this.appKey);
  }

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();

    if (!this.enabled) {
      return {
        jobs: [],
        errors: [],
        source: this.name,
        durationMs: Date.now() - start,
      };
    }

    const errors: string[] = [];
    const seenIds = new Set<string>();
    const jobs: RawJob[] = [];

    // Build search query from the first title (most specific)
    const primaryQuery = config.titles[0] ?? "software engineer";

    // Search all countries in parallel
    const results = await Promise.allSettled(
      SEARCH_COUNTRIES.map((country) =>
        searchCountry(country, primaryQuery, this.appId, this.appKey)
      )
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const country = SEARCH_COUNTRIES[i];
      if (result.status === "rejected") {
        const msg = result.reason instanceof Error ? result.reason.message : "Unknown error";
        errors.push(`Adzuna ${country.toUpperCase()} failed: ${msg}`);
        continue;
      }
      for (const item of result.value.results ?? []) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        const mapped = mapAdzunaJob(item, country);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
