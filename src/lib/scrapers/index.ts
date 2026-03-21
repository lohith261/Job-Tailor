import { SearchConfigData } from "@/types";
import { Scraper, ScraperOrchestrationResult, ScraperResult } from "./types";
import { RemoteOKScraper } from "./remoteok";
import { RemotiveScraper } from "./remotive";
import { ArbeitnowScraper } from "./arbeitnow";
import { JobicyScraper } from "./jobicy";
import { TheMuseScraper } from "./themuse";
import { AdzunaScraper } from "./adzuna";
import { deduplicateJobs } from "@/lib/dedup";

/** All available scrapers. Add new scrapers here. */
function createScrapers(): Scraper[] {
  const scrapers: Scraper[] = [
    new RemoteOKScraper(),
    new RemotiveScraper(),
    new ArbeitnowScraper(),
    new JobicyScraper(),
    new TheMuseScraper(),
    new AdzunaScraper(), // auto-disables when ADZUNA_APP_ID / ADZUNA_API_KEY are not set
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

  // Run all scrapers concurrently
  const scraperResults: ScraperResult[] = await Promise.allSettled(
    activeScrapers.map((scraper) => scraper.scrape(config))
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
