import { SearchConfigData } from "@/types";
import { Scraper, ScraperOrchestrationResult, ScraperResult } from "./types";
import { RemoteOKScraper } from "./remoteok";
import { RemotiveScraper } from "./remotive";
import { ArbeitnowScraper } from "./arbeitnow";
import { JobicyScraper } from "./jobicy";
import { TheMuseScraper } from "./themuse";
import { AdzunaScraper } from "./adzuna";
import { IntershalaScraper } from "./internshala";
import { NaukriScraper } from "./naukri";
import { IndeedScraper } from "./indeed";
import { LinkedInScraper } from "./linkedin";
import { ApifyLinkedInScraper, ApifyIndeedScraper, ApifyWellfoundScraper } from "./apify";
import { deduplicateJobs } from "@/lib/dedup";
import { redis } from "@/lib/redis";

// ── Redis-backed URL deduplication ────────────────────────────────────────────
// Tracks job URLs seen in the last 48h to skip re-processing known listings.

function seenUrlKey(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `scraper:seen_urls:${date}`;
}

/**
 * Returns only the URLs not seen in the last 48h.
 * Falls back to returning all URLs if Redis is unavailable.
 */
export async function filterSeenUrls(urls: string[]): Promise<string[]> {
  if (urls.length === 0) return [];
  try {
    const key = seenUrlKey();
    const pipeline = redis.pipeline();
    urls.forEach((url) => pipeline.sismember(key, url));
    const results = await pipeline.exec() as number[];
    return urls.filter((_, i) => results[i] === 0);
  } catch {
    // Redis unavailable — degrade gracefully, let the DB upsert handle dedup
    return urls;
  }
}

/**
 * Marks a list of URLs as seen. TTL is 48h so stale entries auto-expire.
 * Safe to call with an empty array.
 */
export async function markUrlsSeen(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    const key = seenUrlKey();
    await redis.sadd(key, urls[0], ...urls.slice(1));
    await redis.expire(key, 60 * 60 * 48); // 48h
  } catch {
    // Best-effort — failure here is non-critical
  }
}

/** Race a scraper call against a timeout — prevents a slow source from stalling the whole run. */
function withScraperTimeout<T>(p: Promise<T>, ms: number, name: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Wraps two scrapers: tries the primary first; if it errors or returns 0 jobs,
 * falls back to the secondary automatically.
 */
class FallbackScraper implements Scraper {
  name: string;
  enabled: boolean;

  constructor(
    private readonly primary: Scraper,
    private readonly secondary: Scraper,
  ) {
    this.name = `${primary.name}→${secondary.name}`;
    this.enabled = primary.enabled || secondary.enabled;
  }

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    if (this.primary.enabled) {
      const result = await this.primary.scrape(config);
      if (result.errors.length === 0 && result.jobs.length > 0) {
        return { ...result, source: this.name };
      }
      console.warn(
        `[FallbackScraper] ${this.primary.name} returned ${result.jobs.length} jobs` +
        (result.errors.length > 0 ? ` with errors: ${result.errors[0]}` : "") +
        ` — falling back to ${this.secondary.name}`
      );
    }

    if (!this.secondary.enabled) {
      return { jobs: [], errors: [`Both ${this.primary.name} and ${this.secondary.name} unavailable`], source: this.name, durationMs: 0 };
    }

    const fallbackResult = await this.secondary.scrape(config);
    return { ...fallbackResult, source: this.name };
  }
}

/** All available scrapers. Add new scrapers here. */
function createScrapers(): Scraper[] {
  const scrapers: Scraper[] = [
    // Free public APIs — always enabled, no proxy needed
    new RemoteOKScraper(),
    new RemotiveScraper(),
    new ArbeitnowScraper(),
    new JobicyScraper(),
    new TheMuseScraper(),
    new AdzunaScraper(),     // auto-disables when ADZUNA_APP_ID / ADZUNA_API_KEY not set
    // LinkedIn: Firecrawl (primary, internal) → scrape.do (fallback, internal) → Apify (external fallback)
    new FallbackScraper(new LinkedInScraper(), new ApifyLinkedInScraper()),
    // Indeed: Firecrawl (primary, internal) → scrape.do (fallback, internal) → Apify (external fallback)
    new FallbackScraper(new IndeedScraper(), new ApifyIndeedScraper()),
    // Wellfound: Apify only (no equivalent Firecrawl page to scrape)
    new ApifyWellfoundScraper(),
    // Naukri: Firecrawl (primary, internal) → scrape.do (fallback, internal)
    new NaukriScraper(),
    // Internshala: Firecrawl (primary, internal) → scrape.do → direct HTTP (all internal)
    new IntershalaScraper(),
  ];
  return scrapers;
}

/**
 * Run all enabled scrapers concurrently against the given search configuration,
 * then deduplicate the combined results.
 *
 * @param config - The search configuration to filter jobs by
 * @param enabledSources - Optional list of source names to enable. If omitted, all scrapers run.
 * @returns Combined, deduplicated job results with metadata
 */
export async function runAllScrapers(
  config: SearchConfigData,
  enabledSources?: string[]
): Promise<ScraperOrchestrationResult> {
  const start = Date.now();
  const scrapers = createScrapers();

  // Filter to only enabled scrapers
  const activeScrapers = scrapers.filter((s) => {
    if (!s.enabled) return false;
    if (enabledSources && enabledSources.length > 0) {
      return enabledSources.includes(s.name);
    }
    return true;
  });

  // Run all scrapers concurrently with a per-scraper 60s timeout
  const scraperResults: ScraperResult[] = await Promise.allSettled(
    activeScrapers.map((scraper) =>
      withScraperTimeout(scraper.scrape(config), 60_000, scraper.name)
    )
  ).then((settled) =>
    settled.map((result, idx) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      // If a scraper promise rejected entirely, wrap error
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : "Scraper failed unexpectedly";
      return {
        jobs: [],
        errors: [errorMessage],
        source: activeScrapers[idx].name,
        durationMs: Date.now() - start,
      } satisfies ScraperResult;
    })
  );

  // Combine all jobs
  const allJobs = scraperResults.flatMap((r) => r.jobs);
  const totalBeforeDedup = allJobs.length;

  // Deduplicate
  const dedupedJobs = deduplicateJobs(allJobs);

  return {
    jobs: dedupedJobs,
    totalBeforeDedup,
    totalAfterDedup: dedupedJobs.length,
    scraperResults,
    durationMs: Date.now() - start,
  };
}

export { createScrapers };
export type { Scraper, ScraperResult, ScraperOrchestrationResult } from "./types";
