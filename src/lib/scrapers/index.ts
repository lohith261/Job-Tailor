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
    new RemoteOKScraper(),
    new RemotiveScraper(),
    new ArbeitnowScraper(),
    new JobicyScraper(),
    new TheMuseScraper(),
    new AdzunaScraper(),     // auto-disables when ADZUNA_APP_ID / ADZUNA_API_KEY not set
    new IntershalaScraper(), // no API key needed
    new NaukriScraper(),     // auto-disables when SCRAPE_DO_TOKEN not set
    // LinkedIn: Apify primary → scrape.do fallback
    new FallbackScraper(new ApifyLinkedInScraper(), new LinkedInScraper()),
    // Indeed: Apify primary → scrape.do fallback
    new FallbackScraper(new ApifyIndeedScraper(), new IndeedScraper()),
    // Wellfound (AngelList) — auto-disables when APIFY_API_TOKEN not set
    new ApifyWellfoundScraper(),
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
