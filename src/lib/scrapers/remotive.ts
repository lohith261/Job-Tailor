import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

const REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs";
const REQUEST_TIMEOUT_MS = 15000;

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string | null;
  description?: string;
  tags?: string[];
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
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

function inferLocationType(location?: string): string {
  const normalized = normalize(location ?? "");
  if (!normalized) return "remote";
  if (normalized.includes("worldwide") || normalized.includes("remote")) return "remote";
  return "remote";
}

function parseSalaryRange(raw?: string | null): {
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
} {
  if (!raw) return {};

  const currency =
    raw.includes("EUR") || raw.includes("€")
      ? "EUR"
      : raw.includes("GBP") || raw.includes("£")
      ? "GBP"
      : "USD";

  const matches = raw.match(/[\d,]+/g) ?? [];
  const values = matches
    .map((value) => Number.parseInt(value.replace(/,/g, ""), 10))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return {};

  return {
    salaryMin: values[0],
    salaryMax: values.length > 1 ? values[1] : undefined,
    salaryCurrency: currency,
  };
}

function inferExperienceLevel(job: RemotiveJob): string | undefined {
  const searchable = normalize([job.title, job.job_type, job.description].filter(Boolean).join(" "));
  if (searchable.includes("intern")) return "intern";
  if (searchable.includes("junior") || searchable.includes("entry level") || searchable.includes("jr")) return "junior";
  if (searchable.includes("staff") || searchable.includes("principal")) return "lead";
  if (searchable.includes("lead")) return "lead";
  if (searchable.includes("senior") || searchable.includes("sr")) return "senior";
  return "mid";
}

function categoryMatches(job: RemotiveJob, config: SearchConfigData): boolean {
  if (config.industries.length === 0) return true;
  const category = normalize(job.category ?? "");
  if (!category) return false;
  return config.industries.some((industry) => category.includes(normalize(industry)));
}

function titleMatches(jobTitle: string, configTitles: string[]): boolean {
  if (configTitles.length === 0) return true;
  const jobWords = new Set(normalize(jobTitle).split(/\s+/));
  return configTitles.some((candidate) => {
    const candidateNorm = normalize(candidate);
    const jobNorm = normalize(jobTitle);
    // Substring match
    if (jobNorm.includes(candidateNorm) || candidateNorm.includes(jobNorm)) return true;
    // Word-level overlap (at least one meaningful word in common)
    const candidateWords = candidateNorm.split(/\s+/).filter((w) => w.length > 2);
    return candidateWords.some((w) => jobWords.has(w));
  });
}

function matchesConfig(job: RawJob, config: SearchConfigData): boolean {
  if (
    config.blacklistedCompanies.some(
      (company) => normalize(company) === normalize(job.company)
    )
  ) {
    return false;
  }

  if (!titleMatches(job.title, config.titles)) return false;

  // Remote preferred globally; India jobs accept any location type
  if (!passesGeoFilter(job.location, job.locationType)) return false;

  if (config.experienceLevel && job.experienceLevel) {
    const expected = normalize(config.experienceLevel);
    const actual = normalize(job.experienceLevel);
    if (expected !== actual) return false;
  }

  if (config.salaryMin && job.salaryMax && job.salaryMax < config.salaryMin) {
    return false;
  }
  if (config.salaryMax && job.salaryMin && job.salaryMin > config.salaryMax) {
    return false;
  }

  const searchable = normalize(
    [job.title, job.description, ...(job.tags ?? [])].filter(Boolean).join(" ")
  );

  if (
    config.includeKeywords.length > 0 &&
    !config.includeKeywords.some((keyword) => searchable.includes(normalize(keyword)))
  ) {
    return false;
  }

  if (
    config.excludeKeywords.some((keyword) => searchable.includes(normalize(keyword)))
  ) {
    return false;
  }

  return true;
}

function buildQueries(config: SearchConfigData): string[] {
  const queries = new Set<string>();
  for (const title of config.titles.slice(0, 3)) {
    queries.add(title);
  }
  for (const keyword of config.includeKeywords.slice(0, 2)) {
    queries.add(keyword);
  }
  if (queries.size === 0) {
    queries.add("");
  }
  return Array.from(queries);
}

function mapRemotiveJob(raw: RemotiveJob): RawJob | null {
  if (!raw.title || !raw.company_name || !raw.url) return null;

  const salary = parseSalaryRange(raw.salary);
  const location = raw.candidate_required_location?.trim() || "Remote";

  return {
    title: raw.title.trim(),
    company: raw.company_name.trim(),
    location,
    locationType: inferLocationType(location),
    url: raw.url,
    source: "remotive",
    description: raw.description ? stripHtml(raw.description).slice(0, 2500) : undefined,
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryCurrency: salary.salaryCurrency,
    experienceLevel: inferExperienceLevel(raw),
    industry: raw.category?.trim() || undefined,
    tags: (raw.tags ?? []).map((tag) => normalize(tag)),
    postedAt: raw.publication_date ? new Date(raw.publication_date) : undefined,
  };
}

async function fetchJobs(url: string): Promise<RemotiveResponse> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CustomJobFinder/1.0 (+https://github.com/lohith261/CustomJobFinder)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Remotive API returned ${res.status}`);
  }

  return (await res.json()) as RemotiveResponse;
}

export class RemotiveScraper implements Scraper {
  name = "remotive";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const seenUrls = new Set<string>();
    const jobs: RawJob[] = [];

    const queries = buildQueries(config);

    // Run all queries in parallel instead of sequentially
    const results = await Promise.allSettled(
      queries.map((query) => {
        const params = new URLSearchParams();
        params.set("limit", "100");
        if (query) params.set("search", query);
        return fetchJobs(`${REMOTIVE_API_URL}?${params.toString()}`);
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        const message = result.reason instanceof Error ? result.reason.message : "Unknown Remotive error";
        errors.push(`"${queries[i] || "default"}" query failed: ${message}`);
        continue;
      }
      for (const item of result.value.jobs ?? []) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);
        if (!categoryMatches(item, config)) continue;
        const mapped = mapRemotiveJob(item);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return {
      jobs,
      errors,
      source: this.name,
      durationMs: Date.now() - start,
    };
  }
}
