// No API key needed. Scrapes internshala.com/jobs — India's largest fresher job platform.

import { RawJob, SearchConfigData } from "@/types";
import { Scraper, ScraperResult } from "./types";
import { passesGeoFilter } from "./geo-filter";
import { scrapeDOFetch, isScrapeDOEnabled } from "./scrape-do";

const INTERNSHALA_BASE_URL = "https://internshala.com/jobs";
const REQUEST_TIMEOUT_MS = 15000;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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

function inferExperienceLevel(title: string, description: string): string | undefined {
  const text = (title + " " + description).toLowerCase();
  if (text.includes("intern")) return "intern";
  if (text.includes("fresher") || text.includes("entry level") || text.includes("0-1") || text.includes("0 - 1")) return "junior";
  if (text.includes("junior") || text.includes("jr ") || text.includes("entry")) return "junior";
  if (text.includes("principal") || text.includes("staff engineer")) return "lead";
  if (text.includes("lead ") || text.includes("tech lead")) return "lead";
  if (text.includes("senior") || text.includes("sr ") || text.includes("sr.")) return "senior";
  return "mid";
}

function inferLocationType(locationText: string, descriptionText: string): string {
  const combined = (locationText + " " + descriptionText).toLowerCase();
  if (combined.includes("work from home") || combined.includes("wfh") || combined.includes("remote")) return "remote";
  if (combined.includes("hybrid")) return "hybrid";
  return "onsite";
}

// ─── HTML Parsing ─────────────────────────────────────────────────────────────

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  url: string;
  salary?: string;
  postedDate?: string;
  description?: string;
}

/**
 * Extract a regex-matched group from HTML, returning the trimmed string or undefined.
 */
function extractGroup(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1] ? stripHtml(match[1]).trim() || undefined : undefined;
}

/**
 * Primary parser: tries to find job cards by common Internshala class names.
 * Returns an array of raw HTML blocks, one per job listing.
 */
function extractJobCardBlocks(html: string): string[] {
  // Internshala has historically used these container classes. Try them in order.
  const containerPatterns = [
    // Newer structure: individual_internship divs
    /<div[^>]+class="[^"]*individual_internship[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*individual_internship[^"]*"|<\/div>\s*<\/div>\s*<\/div>\s*(?:<!--|\s*<div[^>]+id="load_more))/gi,
    // Job cards with job-internship-card
    /<div[^>]+class="[^"]*job-internship-card[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*job-internship-card[^"]*"|$)/gi,
    // internship_meta containers
    /<div[^>]+class="[^"]*internship_meta[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]+class="[^"]*internship_meta[^"]*"|$)/gi,
  ];

  for (const pattern of containerPatterns) {
    const blocks: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(html)) !== null) {
      if (match[0].length > 50) {
        blocks.push(match[0]);
      }
    }
    if (blocks.length > 0) {
      console.log(`[IntershalaScraper] Found ${blocks.length} job cards via pattern: ${pattern.source.slice(0, 60)}...`);
      return blocks;
    }
  }

  console.log("[IntershalaScraper] No job card blocks found via class-based patterns; will try regex fallback.");
  return [];
}

/**
 * Parse a single job card HTML block into a ParsedJob.
 */
function parseJobCardBlock(block: string): ParsedJob | null {
  // Title: <a class="job-title-href" ...>Title</a>
  const titlePatterns = [
    /class="job-title-href"[^>]*>([^<]{2,120})</i,
    /id="job_title"[^>]*>([^<]{2,120})</i,
    /class="[^"]*job-internship-name[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,120})</i,
    /<h2[^>]*>\s*(?:<[^>]+>)*([^<]{2,120})<\/h2>/i,
    /<h3[^>]*>\s*(?:<[^>]+>)*([^<]{2,120})<\/h3>/i,
  ];

  let title: string | undefined;
  for (const p of titlePatterns) {
    title = extractGroup(block, p);
    if (title && title.length > 1) break;
  }
  if (!title) return null;

  // Company: <p class="company-name">Name</p>
  const companyPatterns = [
    /class="company-name"[^>]*>\s*([^<]{2,120})/i,
    /class="[^"]*company[-_]name[^"]*"[^>]*>\s*([^<]{2,120})</i,
    /class="[^"]*company[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,120})</i,
  ];

  let company: string | undefined;
  for (const p of companyPatterns) {
    company = extractGroup(block, p);
    if (company && company.length > 1) break;
  }
  if (!company) return null;

  // URL: data-href on card div, or href in the job-title-href anchor
  const urlPatterns = [
    /data-href='([^']+)'/i,
    /data-href="([^"]+)"/i,
    /class="job-title-href"[^>]*href="([^"]+)"/i,
    /href="(\/job\/detail\/[^"]+)"/i,
    /href="(\/jobs\/details\/[^"]+)"/i,
    /href="(\/internship\/detail\/[^"]+)"/i,
  ];

  let relativeUrl: string | undefined;
  for (const p of urlPatterns) {
    relativeUrl = extractGroup(block, p);
    if (relativeUrl) break;
  }

  const url = relativeUrl
    ? relativeUrl.startsWith("http")
      ? relativeUrl
      : `https://internshala.com${relativeUrl}`
    : undefined;

  if (!url) return null;

  // Location: class="row-1-item locations" contains <a>City</a> tags
  let location: string | undefined;
  const locBlockMatch = block.match(/class="row-1-item[^"]*locations[^"]*"[^>]*>([\s\S]{0,400}?)(?:<\/p>|<!-- \/locations)/i);
  if (locBlockMatch) {
    const cities = [...locBlockMatch[1].matchAll(/<a[^>]*>([^<]{1,60})<\/a>/gi)]
      .map((m) => m[1].trim())
      .filter(Boolean);
    if (cities.length > 0) location = cities.join(", ");
  }
  if (!location) {
    const locationPatterns = [
      /class="[^"]*location_link[^"]*"[^>]*>([^<]{2,100})</i,
      /class="[^"]*location[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,100})</i,
    ];
    for (const p of locationPatterns) {
      location = extractGroup(block, p);
      if (location && location.length > 1) break;
    }
  }

  // Salary: <!-- salary --> block contains ₹ amount in <span class="desktop">
  const salaryPatterns = [
    /ic-16-money[^>]*>[\s\S]{0,200}?<span[^>]*class="desktop"[^>]*>\s*([₹\d\s,\-–LPAlpa\/monthy]+)/i,
    /class="[^"]*salary[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})</i,
    /class="[^"]*stipend[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})</i,
    /class="[^"]*ctc[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,80})</i,
  ];

  let salaryRaw: string | undefined;
  for (const p of salaryPatterns) {
    salaryRaw = extractGroup(block, p);
    if (salaryRaw) break;
  }

  // Posted date
  const datePatterns = [
    /class="[^"]*posted[-_]?(?:on|date|time)[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,60})</i,
    /class="[^"]*date[^"]*"[^>]*>\s*(?:<[^>]+>)*([^<]{2,60})</i,
    /(\d+\s+(?:day|week|month|hour)s?\s+ago)/i,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4})/i,
  ];

  let postedDate: string | undefined;
  for (const p of datePatterns) {
    postedDate = extractGroup(block, p);
    if (postedDate) break;
  }

  return {
    title: decodeHtmlEntities(title),
    company: decodeHtmlEntities(company),
    location: location ? decodeHtmlEntities(location) : "India",
    url,
    salary: salaryRaw ? decodeHtmlEntities(salaryRaw) : undefined,
    postedDate,
  };
}

/**
 * Regex-based fallback: scan the entire HTML for job title + company + URL triples
 * by looking for anchor tags near structured-data or JSON-LD job listings.
 */
function regexFallbackParse(html: string): ParsedJob[] {
  const results: ParsedJob[] = [];

  // Try JSON-LD structured data first (most reliable fallback)
  const jsonLdPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(ldMatch[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] !== "JobPosting") continue;
        const title = item.title ?? item.name;
        const company =
          item.hiringOrganization?.name ?? item.hiringOrganization;
        const jobUrl =
          item.url ?? item.mainEntityOfPage?.["@id"];
        const location =
          item.jobLocation?.address?.addressLocality ??
          item.jobLocation?.address?.addressRegion ??
          "India";
        const salary =
          item.baseSalary?.value?.minValue
            ? `₹${item.baseSalary.value.minValue}–${item.baseSalary.value.maxValue} ${item.baseSalary.value.unitText ?? ""}`
            : undefined;
        const postedDate = item.datePosted;
        if (title && company && jobUrl) {
          results.push({ title, company, location, url: jobUrl, salary, postedDate });
        }
      }
    } catch {
      // Not valid JSON, skip
    }
  }

  if (results.length > 0) {
    console.log(`[IntershalaScraper] Found ${results.length} jobs via JSON-LD structured data.`);
    return results;
  }

  // Last resort: scan for href patterns that look like job detail pages
  const linkPattern =
    /href="(\/job\/detail\/[^"]+)"[^>]*>\s*(?:<[^>]*>)*([^<]{3,120})/gi;
  let linkMatch: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const relUrl = linkMatch[1];
    const rawTitle = stripHtml(linkMatch[2]).trim();
    if (!relUrl || !rawTitle || rawTitle.length < 3 || seen.has(relUrl)) continue;
    seen.add(relUrl);
    const fullUrl = `https://internshala.com${relUrl}`;
    // Try to find the company in nearby HTML (within 500 chars ahead)
    const surroundingHtml = html.slice(
      Math.max(0, linkMatch.index - 200),
      linkMatch.index + 800
    );
    const companyMatch =
      surroundingHtml.match(/class="[^"]*company[^"]*"[^>]*>([^<]{2,100})</i) ??
      surroundingHtml.match(/data-company-name="([^"]{2,100})"/i);
    const company = companyMatch ? decodeHtmlEntities(stripHtml(companyMatch[1])) : "Unknown";

    results.push({
      title: decodeHtmlEntities(rawTitle),
      company,
      location: "India",
      url: fullUrl,
    });
  }

  console.log(`[IntershalaScraper] Regex fallback found ${results.length} jobs.`);
  return results;
}

// ─── Salary parsing ───────────────────────────────────────────────────────────

function parseSalaryINR(salaryText: string): { min?: number; max?: number } {
  // Handle "Not Disclosed" or empty
  if (!salaryText || /not\s+disclosed/i.test(salaryText)) return {};

  // Strip currency symbols and non-numeric noise
  const cleaned = salaryText.replace(/[₹,\s]/g, "").toLowerCase();

  // Pattern: ranges like "5-10 lpa" or "500000-800000"
  const lpaRange = salaryText.match(/([\d.]+)\s*[-–]\s*([\d.]+)\s*lpa/i);
  if (lpaRange) {
    return {
      min: Math.round(parseFloat(lpaRange[1]) * 100000),
      max: Math.round(parseFloat(lpaRange[2]) * 100000),
    };
  }

  const lpaSingle = salaryText.match(/([\d.]+)\s*lpa/i);
  if (lpaSingle) {
    const val = Math.round(parseFloat(lpaSingle[1]) * 100000);
    return { min: val, max: val };
  }

  // Monthly stipend ranges: "15000 - 25000 /month"
  const monthlyRange = salaryText.match(/([\d,]+)\s*[-–]\s*([\d,]+)\s*(?:\/month|per month|pm)/i);
  if (monthlyRange) {
    return {
      min: parseInt(monthlyRange[1].replace(/,/g, ""), 10) * 12,
      max: parseInt(monthlyRange[2].replace(/,/g, ""), 10) * 12,
    };
  }

  // Plain number range
  const numRange = cleaned.match(/([\d]+)\s*[-–]\s*([\d]+)/);
  if (numRange) {
    const a = parseInt(numRange[1], 10);
    const b = parseInt(numRange[2], 10);
    // If numbers look like monthly (< 200000), annualise
    if (a < 200000) return { min: a * 12, max: b * 12 };
    return { min: a, max: b };
  }

  return {};
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapParsedJob(parsed: ParsedJob): RawJob {
  const salary = parsed.salary ? parseSalaryINR(parsed.salary) : {};
  const locationType = inferLocationType(parsed.location, parsed.description ?? "");
  const experienceLevel = inferExperienceLevel(parsed.title, parsed.description ?? "");

  let postedAt: Date | undefined;
  if (parsed.postedDate) {
    // Try ISO or natural language like "3 days ago"
    const daysAgoMatch = parsed.postedDate.match(/(\d+)\s+day/i);
    const weeksAgoMatch = parsed.postedDate.match(/(\d+)\s+week/i);
    const monthsAgoMatch = parsed.postedDate.match(/(\d+)\s+month/i);
    if (daysAgoMatch) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(daysAgoMatch[1], 10));
      postedAt = d;
    } else if (weeksAgoMatch) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(weeksAgoMatch[1], 10) * 7);
      postedAt = d;
    } else if (monthsAgoMatch) {
      const d = new Date();
      d.setMonth(d.getMonth() - parseInt(monthsAgoMatch[1], 10));
      postedAt = d;
    } else {
      const parsed2 = Date.parse(parsed.postedDate);
      if (!isNaN(parsed2)) postedAt = new Date(parsed2);
    }
  }

  return {
    title: parsed.title,
    company: parsed.company,
    location: parsed.location || "India",
    locationType,
    url: parsed.url,
    source: "internshala",
    description: parsed.description,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.min || salary.max ? "INR" : undefined,
    experienceLevel,
    postedAt,
  };
}

// ─── Config matching ──────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

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

async function fetchInternshalaPage(slug: string): Promise<ParsedJob[]> {
  const url = `${INTERNSHALA_BASE_URL}/${slug}/`;
  console.log(`[IntershalaScraper] Fetching: ${url}`);

  let html: string;

  if (isScrapeDOEnabled()) {
    html = await scrapeDOFetch(url, { timeoutMs: 30000 });
  } else {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: "https://internshala.com/jobs/",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    html = await response.text();
  }
  console.log(`[IntershalaScraper] Received ${html.length} bytes for slug "${slug}"`);

  // Try class-based card extraction first
  const cardBlocks = extractJobCardBlocks(html);
  if (cardBlocks.length > 0) {
    const jobs: ParsedJob[] = [];
    for (const block of cardBlocks) {
      const parsed = parseJobCardBlock(block);
      if (parsed) jobs.push(parsed);
    }
    if (jobs.length > 0) {
      console.log(`[IntershalaScraper] Parsed ${jobs.length} jobs from card blocks for "${slug}"`);
      return jobs;
    }
    console.log(`[IntershalaScraper] Card blocks found but none parsed successfully, trying fallback.`);
  }

  // Fallback: regex + JSON-LD
  const fallbackJobs = regexFallbackParse(html);
  return fallbackJobs;
}

// ─── Scraper class ────────────────────────────────────────────────────────────

export class IntershalaScraper implements Scraper {
  name = "internshala";
  enabled = true; // No API key required

  async scrape(config: SearchConfigData): Promise<ScraperResult> {
    const start = Date.now();
    const errors: string[] = [];
    const jobs: RawJob[] = [];
    const seenUrls = new Set<string>();

    // Use up to first 2 titles to stay within parallel search limit
    const titlesToSearch = config.titles.slice(0, 2);
    if (titlesToSearch.length === 0) {
      titlesToSearch.push("software-developer");
    }

    const slugs = titlesToSearch.map(titleToSlug);

    // Search up to 2 titles in parallel
    const results = await Promise.allSettled(slugs.map((slug) => fetchInternshalaPage(slug)));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const slug = slugs[i];

      if (result.status === "rejected") {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`Internshala fetch failed for "${slug}": ${msg}`);
        continue;
      }

      for (const parsed of result.value) {
        if (seenUrls.has(parsed.url)) continue;
        seenUrls.add(parsed.url);

        const mapped = mapParsedJob(parsed);
        if (matchesConfig(mapped, config)) {
          jobs.push(mapped);
        }
      }
    }

    return { jobs, errors, source: this.name, durationMs: Date.now() - start };
  }
}
