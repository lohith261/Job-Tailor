import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";

// Free public API — no key required
// Docs: https://www.themuse.com/developers/api/v2
const THEMUSE_API_URL = "https://www.themuse.com/api/public/jobs";
const REQUEST_TIMEOUT_MS = 15000;

// The Muse uses predefined category names — we always query these for tech
const TECH_CATEGORIES = ["Software Engineer", "Engineering", "Data & Analytics", "IT"];

interface TheMuseJob {
  id: number;
  name: string;
  type: string;
  publication_date: string;
  short_name: string;
  model_type: string;
  refs: { landing_page: string };
  company: { id: number; name: string; short_name: string };
  locations: Array<{ name: string }>;
  levels: Array<{ name: string; short_name: string }>;
  categories: Array<{ name: string }>;
}

interface TheMuseResponse {
  results: TheMuseJob[];
  page: number;
  page_count: number;
  total: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function mapLevel(levels: Array<{ short_name: string }>): string | undefined {
  if (!levels || levels.length === 0) return undefined;
  const s = levels[0].short_name;
  if (s === "internship") return "intern";
  if (s === "entry") return "junior";
  if (s === "mid") return "mid";
  if (s === "senior" || s === "management") return "senior";
  if (s === "director" || s === "vp" || s === "c-suite") return "lead";
  return "mid";
}

function inferLocationType(locations: Array<{ name: string }>): string {
  const names = locations.map((l) => normalize(l.name));
  if (names.some((n) => n.includes("remote") || n.includes("anywhere"))) return "remote";
  if (names.length === 0) return "remote"; // no location = treat as remote
  return "onsite";
}

function mapTheMuseJob(raw: TheMuseJob): RawJob | null {
  if (!raw.name || !raw.company?.name || !raw.refs?.landing_page) return null;

  const primaryLocation = raw.locations?.[0]?.name?.trim() || "Remote";
  const locationType = inferLocationType(raw.locations ?? []);

  return {
    title: raw.name.trim(),
    company: raw.company.name.trim(),
    location: primaryLocation,
    locationType,
    url: raw.refs.landing_page,
    source: "themuse",
    experienceLevel: mapLevel(raw.levels ?? []),
    tags: (raw.categories ?? []).map((c) => normalize(c.name)),
    postedAt: raw.publication_date ? new Date(raw.publication_date) : undefined,
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

  if (config.excludeKeywords.length > 0) {
    const searchable = normalize([job.title, ...(job.tags ?? [])].join(" "));
    if (config.excludeKeywords.some((kw) => searchable.includes(normalize(kw)))) return false;
  }

  return true;
}

async function fetchPage(category: string, page: number): Promise<TheMuseResponse> {
  const params = new URLSearchParams({
    category,
    page: String(page),
    descending: "true",
  });
  const res = await fetch(`${THEMUSE_API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "JobTailor/1.0 (+https://github.com/lohith261/job-tailor)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`The Muse API returned ${res.status}`);
  return (await res.json()) as TheMuseResponse;
}

export class TheMuseScraper implements Scraper {
  name = "themuse";
  enabled = true;

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const seenIds = new Set<number>();
    const jobs: RawJob[] = [];

    // Fetch page 1 of each tech category in parallel
    const requests = TECH_CATEGORIES.map((cat) => ({ cat, page: 1 }));
    const results = await Promise.allSettled(
      requests.map(({ cat, page }) => fetchPage(cat, page))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { cat } = requests[i];
      if (result.status === "rejected") {
        const msg = result.reason instanceof Error ? result.reason.message : "Unknown error";
        errors.push(`The Muse "${cat}" failed: ${msg}`);
        continue;
      }
      for (const item of result.value.results ?? []) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        const mapped = mapTheMuseJob(item);
        if (mapped && matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
