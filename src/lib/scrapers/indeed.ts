// Indeed India scraper — scrapes in.indeed.com via scrape.do proxy.
// Auto-disables when SCRAPE_DO_TOKEN is not set.
// Uses embedded JSON blob (primary) and HTML card parsing (fallback).

import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";
import { scrapeDOFetch, isScrapeDOEnabled } from "./scrape-do";

const INDEED_BASE_URL = "https://in.indeed.com/jobs";
const REQUEST_TIMEOUT_MS = 30000;

// ─── Indeed JSON blob types ────────────────────────────────────────────────────

interface IndeedExtractedSalary {
  min?: number;
  max?: number;
  type?: string; // "yearly" | "monthly" | "hourly"
}

interface IndeedJobResult {
  jobkey?: string;
  displayTitle?: string;
  title?: string;
  company?: string;
  formattedLocation?: string;
  snippet?: string;
  pubDate?: string; // epoch ms as string or relative
  salary?: string;
  extractedSalary?: IndeedExtractedSalary;
  jobTypes?: string[];
  remoteWork?: boolean;
  thirdPartyApplyUrl?: string;
  viewJobLink?: string;
}

interface IndeedMosaicModel {
  results?: IndeedJobResult[];
}

interface IndeedMosaicProviderData {
  metaData?: {
    mosaicProviderJobCardsModel?: IndeedMosaicModel;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function inferLocationType(
  remoteWork: boolean | undefined,
  location: string,
  description: string
): string {
  if (remoteWork) return "remote";
  const combined = normalize(location + " " + description);
  if (combined.includes("work from home") || combined.includes("remote") || combined.includes("wfh")) {
    return "remote";
  }
  if (combined.includes("hybrid")) return "hybrid";
  return "onsite";
}

function inferExperienceLevel(title: string, snippet: string): string | undefined {
  const text = normalize(title + " " + snippet.slice(0, 500));
  if (text.includes("intern")) return "intern";
  if (
    text.includes("fresher") ||
    text.includes("entry level") ||
    text.includes("entry-level") ||
    text.includes("0-1") ||
    text.includes("0 - 1")
  )
    return "junior";
  if (text.includes("junior") || text.includes("jr ") || text.includes("entry")) return "junior";
  if (text.includes("principal") || text.includes("staff engineer")) return "lead";
  if (text.includes("lead ") || text.includes("tech lead")) return "lead";
  if (text.includes("senior") || text.includes("sr ") || text.includes("sr.")) return "senior";
  return "mid";
}

/**
 * Parse Indeed relative date strings into a Date object.
 * Examples: "Just posted", "Today", "1 day ago", "3 days ago", "30+ days ago"
 */
function parsePostedDate(pubDate: string | undefined): Date | undefined {
  if (!pubDate) return undefined;

  const s = pubDate.trim().toLowerCase();

  if (s === "just posted" || s === "today" || s === "active today") {
    return new Date();
  }

  // "1 day ago", "3 days ago", "30+ days ago"
  const daysMatch = s.match(/(\d+)\+?\s+day/);
  if (daysMatch) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(daysMatch[1], 10));
    return d;
  }

  // epoch ms (numeric string)
  if (/^\d{10,}$/.test(s)) {
    const ts = parseInt(s, 10);
    // if 10 digits — seconds; 13 digits — ms
    return new Date(s.length <= 10 ? ts * 1000 : ts);
  }

  // ISO or natural date fallback
  const parsed = Date.parse(pubDate);
  if (!isNaN(parsed)) return new Date(parsed);

  return undefined;
}

/**
 * Convert Indeed extractedSalary to min/max annual INR.
 * extractedSalary.type can be "yearly" | "monthly" | "hourly".
 */
function parseSalaryFromExtracted(extracted: IndeedExtractedSalary | undefined): {
  min?: number;
  max?: number;
} {
  if (!extracted || (extracted.min === undefined && extracted.max === undefined)) return {};

  const multiplier =
    extracted.type === "monthly"
      ? 12
      : extracted.type === "hourly"
      ? 2080 // 40 hrs/week * 52 weeks
      : 1; // yearly (default)

  return {
    min: extracted.min !== undefined ? Math.round(extracted.min * multiplier) : undefined,
    max: extracted.max !== undefined ? Math.round(extracted.max * multiplier) : undefined,
  };
}

/**
 * Try to parse salary from free-text salary string.
 * Examples: "₹3,00,000 - ₹5,00,000 a year", "₹25,000 a month"
 */
function parseSalaryText(salaryText: string | undefined): { min?: number; max?: number } {
  if (!salaryText) return {};

  const cleaned = salaryText.replace(/[₹,\s]/g, "").toLowerCase();

  // "300000-500000ayear" or "300000 - 500000 a year"
  const yearlyRange = cleaned.match(/([\d]+)\s*[-–]\s*([\d]+)\s*(?:a\s*)?year/);
  if (yearlyRange) {
    return { min: parseInt(yearlyRange[1], 10), max: parseInt(yearlyRange[2], 10) };
  }

  // "25000 a month"
  const monthlyRange = cleaned.match(/([\d]+)\s*[-–]\s*([\d]+)\s*(?:a\s*)?month/);
  if (monthlyRange) {
    return {
      min: parseInt(monthlyRange[1], 10) * 12,
      max: parseInt(monthlyRange[2], 10) * 12,
    };
  }

  const monthlySingle = cleaned.match(/([\d]+)\s*(?:a\s*)?month/);
  if (monthlySingle) {
    const val = parseInt(monthlySingle[1], 10) * 12;
    return { min: val, max: val };
  }

  // lpa range
  const lpaRange = salaryText.match(/([\d.]+)\s*[-–]\s*([\d.]+)\s*lpa/i);
  if (lpaRange) {
    return {
      min: Math.round(parseFloat(lpaRange[1]) * 100000),
      max: Math.round(parseFloat(lpaRange[2]) * 100000),
    };
  }

  return {};
}

// ─── Strategy 1: Embedded JSON blob ───────────────────────────────────────────

/**
 * Attempt to extract Indeed's embedded mosaic job data from the page HTML.
 * Indeed embeds job card data as window.mosaic.providerData["mosaic-provider-jobcards"] = {...}
 */
function extractJsonBlob(html: string): IndeedJobResult[] {
  // Pattern 1: mosaic-provider-jobcards assignment
  const pattern1 =
    /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]+?\});\s*window/;
  const match1 = html.match(pattern1);
  if (match1?.[1]) {
    try {
      const data = JSON.parse(match1[1]) as IndeedMosaicProviderData;
      const results = data?.metaData?.mosaicProviderJobCardsModel?.results;
      if (Array.isArray(results) && results.length > 0) {
        console.log(`[IndeedScraper] Strategy 1a (mosaic-provider-jobcards): found ${results.length} results`);
        return results;
      }
    } catch {
      // JSON parse failed, continue
    }
  }

  // Pattern 2: window._initialData
  const pattern2 = /window\._initialData\s*=\s*(\{[\s\S]+?\});\s*(?:window|var|let|const|$)/;
  const match2 = html.match(pattern2);
  if (match2?.[1]) {
    try {
      // _initialData can be very large; try to pull results from it
      type InitialDataShape = {
        metaData?: {
          mosaicProviderJobCardsModel?: IndeedMosaicModel;
        };
      };
      const data = JSON.parse(match2[1]) as InitialDataShape;
      const model = data?.metaData?.mosaicProviderJobCardsModel?.results;
      if (Array.isArray(model) && model.length > 0) {
        console.log(`[IndeedScraper] Strategy 1b (_initialData): found ${model.length} results`);
        return model;
      }
    } catch {
      // JSON parse failed, continue
    }
  }

  // Pattern 3: script tag with id="mosaic-data"
  const pattern3 = /<script[^>]+id="mosaic-data"[^>]*>([\s\S]*?)<\/script>/i;
  const match3 = html.match(pattern3);
  if (match3?.[1]) {
    try {
      const scriptContent = match3[1];
      // The script might contain window.mosaic.providerData = {...}
      const innerMatch = scriptContent.match(
        /window\.mosaic\.providerData\["mosaic-provider-jobcards"\]\s*=\s*(\{[\s\S]+?\});\s*(?:window|$)/
      );
      if (innerMatch?.[1]) {
        const data = JSON.parse(innerMatch[1]) as IndeedMosaicProviderData;
        const results = data?.metaData?.mosaicProviderJobCardsModel?.results;
        if (Array.isArray(results) && results.length > 0) {
          console.log(`[IndeedScraper] Strategy 1c (mosaic-data script): found ${results.length} results`);
          return results;
        }
      }
      // Try parsing the entire mosaic-data script as JSON
      const data = JSON.parse(scriptContent) as IndeedMosaicProviderData;
      const results = data?.metaData?.mosaicProviderJobCardsModel?.results;
      if (Array.isArray(results) && results.length > 0) {
        console.log(`[IndeedScraper] Strategy 1c-json (mosaic-data): found ${results.length} results`);
        return results;
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return [];
}

function mapJsonBlobJob(raw: IndeedJobResult): RawJob | null {
  const title = raw.displayTitle ?? raw.title;
  if (!title || !raw.company) return null;

  const jobkey = raw.jobkey;
  const location = raw.formattedLocation ?? "India";
  const description = stripHtml(raw.snippet ?? "");
  const locationType = inferLocationType(raw.remoteWork, location, description);
  const experienceLevel = inferExperienceLevel(title, description);

  // Build job URL from jobkey or provided link
  let url: string;
  if (raw.viewJobLink) {
    url = raw.viewJobLink.startsWith("http")
      ? raw.viewJobLink
      : `https://in.indeed.com${raw.viewJobLink}`;
  } else if (jobkey) {
    url = `https://in.indeed.com/viewjob?jk=${jobkey}`;
  } else {
    return null;
  }

  const salary =
    parseSalaryFromExtracted(raw.extractedSalary) || parseSalaryText(raw.salary);

  const tags = raw.jobTypes?.filter((t) => t.length > 0);
  const postedAt = parsePostedDate(raw.pubDate);

  return {
    title: decodeHtmlEntities(title.trim()),
    company: decodeHtmlEntities(raw.company.trim()),
    location: decodeHtmlEntities(location.trim()),
    locationType,
    url,
    source: "indeed",
    description: description.slice(0, 2500),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.min || salary.max ? "INR" : undefined,
    experienceLevel,
    tags: tags && tags.length > 0 ? tags : undefined,
    postedAt,
  };
}

// ─── Strategy 2: HTML card parsing ────────────────────────────────────────────

interface ParsedHtmlJob {
  jobkey?: string;
  title: string;
  company: string;
  location: string;
  url: string;
  salary?: string;
  postedDate?: string;
  description?: string;
}

/**
 * Extract a regex-matched group from HTML, returning the stripped trimmed string or undefined.
 */
function extractGroup(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1] ? stripHtml(match[1]).trim() || undefined : undefined;
}

/**
 * Split HTML into individual Indeed job card blocks.
 */
function extractJobCardBlocks(html: string): string[] {
  const containerPatterns = [
    // Modern: div.job_seen_beacon
    /<div[^>]+class="[^"]*job_seen_beacon[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*job_seen_beacon[^"]*"|<\/tbody>|<div[^>]+id="mosaic-afterFifthJobResult)/gi,
    // tapItem
    /<div[^>]+class="[^"]*tapItem[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*tapItem[^"]*"|$)/gi,
    // resultContent
    /<div[^>]+class="[^"]*resultContent[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*resultContent[^"]*"|$)/gi,
    // td.resultContent (table layout)
    /<td[^>]+class="[^"]*resultContent[^"]*"[^>]*>([\s\S]*?)(?=<td[^>]+class="[^"]*resultContent[^"]*"|$)/gi,
  ];

  for (const pattern of containerPatterns) {
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(html)) !== null) {
      if (match[0].length > 80) {
        blocks.push(match[0]);
      }
    }
    if (blocks.length > 0) {
      console.log(
        `[IndeedScraper] Strategy 2: found ${blocks.length} job card blocks via pattern: ${pattern.source.slice(0, 60)}...`
      );
      return blocks;
    }
  }

  console.log("[IndeedScraper] Strategy 2: no job card blocks found via class-based patterns.");
  return [];
}

/**
 * Parse a single Indeed job card HTML block.
 */
function parseJobCardBlock(block: string): ParsedHtmlJob | null {
  // Extract jobkey from anchor id or data-jk attribute
  const jobkeyPatterns = [
    /data-jk="([a-f0-9]{16})"/i,
    /id="job_([a-f0-9]{16})"/i,
    /jk=([a-f0-9]{16})/i,
  ];
  let jobkey: string | undefined;
  for (const p of jobkeyPatterns) {
    const m = block.match(p);
    if (m?.[1]) {
      jobkey = m[1];
      break;
    }
  }

  // Title
  const titlePatterns = [
    /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<span[^>]+title="([^"]{2,120})"/i,
    /<a[^>]+class="[^"]*jcs-JobTitle[^"]*"[^>]*>\s*<span[^>]*>([^<]{2,120})<\/span>/i,
    /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]{2,120})<\/a>/i,
    /<span[^>]+title="([^"]{2,120})"[^>]*>/i,
  ];
  let title: string | undefined;
  for (const p of titlePatterns) {
    const m = block.match(p);
    if (m?.[1]) {
      title = decodeHtmlEntities(m[1].trim());
      break;
    }
  }
  if (!title) {
    title = extractGroup(
      block,
      /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>([\s\S]{2,200}?)<\/h2>/i
    );
  }
  if (!title) return null;

  // Company
  const companyPatterns = [
    /class="[^"]*companyName[^"]*"[^>]*>([\s\S]{2,120}?)<\/(?:span|a|div)>/i,
    /data-testid="company-name"[^>]*>([\s\S]{2,120}?)<\/(?:span|a|div)>/i,
  ];
  let company: string | undefined;
  for (const p of companyPatterns) {
    company = extractGroup(block, p);
    if (company && company.length > 1) break;
  }
  if (!company) return null;

  // URL
  const urlPatterns = [
    /href="(\/rc\/clk\?[^"]+)"/i,
    /href="(\/pagead\/clk\?[^"]+)"/i,
    /href="(\/viewjob\?[^"]+)"/i,
    // anchor with id starting with "job_"
    /<a[^>]+id="job_[a-f0-9]+"[^>]+href="([^"]+)"/i,
    /href="([^"]*\/rc\/clk[^"]+)"/i,
  ];
  let relativeUrl: string | undefined;
  for (const p of urlPatterns) {
    relativeUrl = extractGroup(block, p);
    if (relativeUrl) break;
  }
  // fallback: build from jobkey
  const url =
    relativeUrl
      ? relativeUrl.startsWith("http")
        ? relativeUrl
        : `https://in.indeed.com${relativeUrl}`
      : jobkey
      ? `https://in.indeed.com/viewjob?jk=${jobkey}`
      : undefined;
  if (!url) return null;

  // Location
  const locationPatterns = [
    /class="[^"]*companyLocation[^"]*"[^>]*>([\s\S]{2,120}?)<\/(?:div|span)/i,
    /data-testid="text-location"[^>]*>([\s\S]{2,100}?)<\/(?:div|span)/i,
  ];
  let location: string | undefined;
  for (const p of locationPatterns) {
    location = extractGroup(block, p);
    if (location && location.length > 1) break;
  }

  // Salary
  const salaryPatterns = [
    /class="[^"]*salary-snippet[^"]*"[^>]*>([\s\S]{2,120}?)<\/(?:div|span)/i,
    /data-testid="attribute_snippet_testid"[^>]*>([\s\S]{2,120}?)<\/(?:div|span)/i,
    /class="[^"]*salary[^"]*"[^>]*>([\s\S]{2,120}?)<\/(?:div|span)/i,
  ];
  let salary: string | undefined;
  for (const p of salaryPatterns) {
    salary = extractGroup(block, p);
    if (salary) break;
  }

  // Posted date
  const datePatterns = [
    /class="[^"]*date[^"]*"[^>]*>([\s\S]{2,60}?)<\/(?:span|div)/i,
    /data-testid="myJobsStateDate"[^>]*>([\s\S]{2,60}?)<\/(?:span|div)/i,
    /(Just posted|Today|\d+\+?\s+days?\s+ago)/i,
  ];
  let postedDate: string | undefined;
  for (const p of datePatterns) {
    postedDate = extractGroup(block, p);
    if (postedDate) break;
  }

  return {
    jobkey,
    title: decodeHtmlEntities(title),
    company: decodeHtmlEntities(company),
    location: location ? decodeHtmlEntities(location) : "India",
    url,
    salary: salary ? decodeHtmlEntities(salary) : undefined,
    postedDate,
  };
}

function mapHtmlJob(parsed: ParsedHtmlJob): RawJob {
  const description = parsed.description ?? "";
  const salary = parseSalaryText(parsed.salary);
  const locationType = inferLocationType(undefined, parsed.location, description);
  const experienceLevel = inferExperienceLevel(parsed.title, description);
  const postedAt = parsePostedDate(parsed.postedDate);

  return {
    title: parsed.title,
    company: parsed.company,
    location: parsed.location || "India",
    locationType,
    url: parsed.url,
    source: "indeed",
    description: description.slice(0, 2500) || undefined,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.min || salary.max ? "INR" : undefined,
    experienceLevel,
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
    return cn
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .some((w) => jobWords.has(w));
  });
}

function matchesConfig(job: RawJob, config: SearchConfigData): boolean {
  if (config.blacklistedCompanies.some((c) => normalize(c) === normalize(job.company))) {
    return false;
  }
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

async function fetchIndeedJobs(title: string, location: string): Promise<RawJob[]> {
  const params = new URLSearchParams({
    q: title,
    l: location,
    fromage: "14",
    sort: "date",
  });

  const url = `${INDEED_BASE_URL}?${params.toString()}`;
  console.log(`[IndeedScraper] Fetching: ${url}`);

  const html = await scrapeDOFetch(url, { timeoutMs: REQUEST_TIMEOUT_MS });
  console.log(`[IndeedScraper] Received ${html.length} bytes for title="${title}", location="${location}"`);

  // Strategy 1: embedded JSON blob
  const jsonResults = extractJsonBlob(html);
  if (jsonResults.length > 0) {
    const jobs: RawJob[] = [];
    for (const raw of jsonResults) {
      const mapped = mapJsonBlobJob(raw);
      if (mapped) jobs.push(mapped);
    }
    if (jobs.length > 0) {
      console.log(`[IndeedScraper] JSON blob strategy: mapped ${jobs.length} jobs`);
      return jobs;
    }
    console.log(`[IndeedScraper] JSON blob found but 0 valid jobs, falling back to HTML`);
  }

  // Strategy 2: HTML card parsing
  const cardBlocks = extractJobCardBlocks(html);
  if (cardBlocks.length > 0) {
    const jobs: RawJob[] = [];
    for (const block of cardBlocks) {
      const parsed = parseJobCardBlock(block);
      if (parsed) {
        jobs.push(mapHtmlJob(parsed));
      }
    }
    if (jobs.length > 0) {
      console.log(`[IndeedScraper] HTML card strategy: mapped ${jobs.length} jobs`);
      return jobs;
    }
    console.log(`[IndeedScraper] HTML card blocks found but 0 parsed, giving up`);
  }

  console.log(`[IndeedScraper] Both strategies returned 0 jobs for title="${title}"`);
  return [];
}

// ─── Scraper class ─────────────────────────────────────────────────────────────

export class IndeedScraper implements Scraper {
  name = "indeed";
  enabled: boolean;

  constructor() {
    // Auto-disable if scrape.do is not configured — Indeed aggressively blocks direct requests
    this.enabled = isScrapeDOEnabled();
  }

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();

    if (!this.enabled) {
      return { jobs: [], errors: [], source: this.name, durationMs: Date.now() - start };
    }

    const errors: string[] = [];
    const jobs: RawJob[] = [];
    // Deduplicate by jobkey embedded in URL or full URL
    const seenKeys = new Set<string>();

    const location = config.locations[0] ?? "India";

    // Search up to 3 titles in parallel
    const titlesToSearch = config.titles.slice(0, 3);
    if (titlesToSearch.length === 0) {
      titlesToSearch.push("software developer");
    }

    const results = await Promise.allSettled(
      titlesToSearch.map((title) => fetchIndeedJobs(title, location))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const title = titlesToSearch[i];

      if (result.status === "rejected") {
        const msg =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`Indeed fetch failed for "${title}": ${msg}`);
        continue;
      }

      for (const job of result.value) {
        // Derive a dedup key from the URL (includes jobkey or path)
        const dedupKey = job.url;
        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        if (matchesConfig(job, config)) {
          jobs.push(job);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
