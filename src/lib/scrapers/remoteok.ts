import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

const REMOTEOK_API_URL = "https://remoteok.com/api";

/** Rate limiter: ensures at least `delayMs` between requests. */
let lastRequestTime = 0;
const RATE_LIMIT_MS = 1100; // slightly over 1 second to respect 1 req/sec

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SmartJobHuntAssistant/1.0 (job aggregator)",
    },
    signal: AbortSignal.timeout(15000),
  });

  return response;
}

interface RemoteOKJob {
  id?: string;
  slug?: string;
  url?: string;
  title?: string;
  company?: string;
  company_logo?: string;
  date?: string;
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  tags?: string[];
  original?: boolean;
}

function parseExperienceLevel(title: string): string | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("senior") || lower.includes("sr.") || lower.includes("sr ")) {
    return "senior";
  }
  if (lower.includes("junior") || lower.includes("jr.") || lower.includes("jr ")) {
    return "junior";
  }
  if (lower.includes("staff")) return "staff";
  if (lower.includes("lead")) return "senior";
  if (lower.includes("principal")) return "staff";
  if (lower.includes("intern")) return "intern";
  return "mid";
}

function mapRemoteOKJob(raw: RemoteOKJob): RawJob | null {
  if (!raw.title || !raw.company || !raw.url) return null;

  const jobUrl = raw.url.startsWith("http")
    ? raw.url
    : `https://remoteok.com${raw.url}`;

  return {
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: raw.location?.trim() || "Remote",
    locationType: "remote",
    url: jobUrl,
    source: "remoteok",
    description: raw.description
      ? stripHtml(raw.description).slice(0, 2000)
      : undefined,
    salaryMin: raw.salary_min || undefined,
    salaryMax: raw.salary_max || undefined,
    salaryCurrency: raw.salary_min || raw.salary_max ? "USD" : undefined,
    experienceLevel: parseExperienceLevel(raw.title),
    tags: raw.tags?.map((t) => t.toLowerCase().trim()) ?? [],
    postedAt: raw.date ? new Date(raw.date) : undefined,
  };
}

/** Remove basic HTML tags from description text */
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

function matchesConfig(job: RawJob, config: SearchConfigData): boolean {
  // Blacklisted companies
  if (
    config.blacklistedCompanies.some(
      (bc) => bc.toLowerCase() === job.company.toLowerCase()
    )
  ) {
    return false;
  }

  // Title matching — word-level overlap for better recall
  if (config.titles.length > 0) {
    const jobWords = new Set(job.title.toLowerCase().split(/\s+/));
    const hasMatch = config.titles.some((t) => {
      const tNorm = t.toLowerCase();
      const jobNorm = job.title.toLowerCase();
      if (jobNorm.includes(tNorm) || tNorm.includes(jobNorm)) return true;
      return tNorm.split(/\s+/).filter((w) => w.length > 2).some((w) => jobWords.has(w));
    });
    if (!hasMatch) return false;
  }

  // Remote preferred globally; India jobs accept any location type
  if (!passesGeoFilter(job.location, job.locationType)) return false;

  // Experience level
  if (config.experienceLevel && job.experienceLevel) {
    if (config.experienceLevel !== job.experienceLevel) return false;
  }

  // Salary range
  if (config.salaryMin && job.salaryMax) {
    if (job.salaryMax < config.salaryMin) return false;
  }
  if (config.salaryMax && job.salaryMin) {
    if (job.salaryMin > config.salaryMax) return false;
  }

  // Include keywords
  if (config.includeKeywords.length > 0) {
    const searchText = [job.title, job.description ?? "", ...(job.tags ?? [])]
      .join(" ")
      .toLowerCase();
    const hasKeyword = config.includeKeywords.some((kw) =>
      searchText.includes(kw.toLowerCase())
    );
    if (!hasKeyword) return false;
  }

  // Exclude keywords
  if (config.excludeKeywords.length > 0) {
    const searchText = [job.title, job.description ?? "", ...(job.tags ?? [])]
      .join(" ")
      .toLowerCase();
    const hasExcluded = config.excludeKeywords.some((kw) =>
      searchText.includes(kw.toLowerCase())
    );
    if (hasExcluded) return false;
  }

  return true;
}

export class RemoteOKScraper implements Scraper {
  name = "remoteok";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const jobs: RawJob[] = [];

    try {
      // Build search tags from titles and keywords for targeted fetching
      const searchTags = [
        ...config.titles.map((t) =>
          t.toLowerCase().replace(/\s+/g, "-")
        ),
      ].slice(0, 3); // Limit to avoid too many requests

      // If we have specific search tags, query with them; otherwise fetch general listings
      const urls =
        searchTags.length > 0
          ? searchTags.map((tag) => `${REMOTEOK_API_URL}?tag=${encodeURIComponent(tag)}`)
          : [REMOTEOK_API_URL];

      const seenIds = new Set<string>();

      for (const url of urls) {
        try {
          const response = await rateLimitedFetch(url);

          if (!response.ok) {
            errors.push(
              `RemoteOK API returned ${response.status} for ${url}`
            );
            continue;
          }

          const data: RemoteOKJob[] = await response.json();

          // First element in RemoteOK API response is metadata, skip it
          const jobEntries = Array.isArray(data) ? data.slice(1) : [];

          for (const rawJob of jobEntries) {
            const id = rawJob.id?.toString() ?? rawJob.slug ?? rawJob.url;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);

            const mapped = mapRemoteOKJob(rawJob);
            if (mapped && matchesConfig(mapped, config)) {
              jobs.push(mapped);
            }
          }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : `Unknown error fetching ${url}`;
          errors.push(`RemoteOK fetch error: ${message}`);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unknown error in RemoteOK scraper";
      errors.push(message);
    }

    return {
      jobs,
      errors,
      source: this.name,
      durationMs: Date.now() - start,
    };
  }
}
