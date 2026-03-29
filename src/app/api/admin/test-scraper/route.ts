// Admin-only endpoint to test a single scraper without running the full pipeline.
// POST /api/admin/test-scraper
// Body: { scraper: "firecrawl-linkedin" | "firecrawl-indeed" | "naukri" | "internshala" | "linkedin" | "indeed", titles?: string[], locations?: string[] }

import { getRequiredUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { createScrapers } from "@/lib/scrapers";
import type { SearchConfigData } from "@/types";

async function requireAdmin(callerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: callerId },
    select: { isAdmin: true, email: true },
  });
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!(user?.isAdmin || (adminEmail && user?.email === adminEmail));
}

const DEFAULT_CONFIG: SearchConfigData = {
  titles: ["Software Engineer"],
  locations: ["India"],
  locationType: undefined,
  skills: [],
  industries: [],
  preferredCompanies: [],
  experienceLevel: undefined,
  yearsOfExperience: undefined,
  salaryMin: undefined,
  salaryMax: undefined,
  currency: undefined,
  companySize: undefined,
  includeKeywords: [],
  excludeKeywords: [],
  blacklistedCompanies: [],
  jobType: undefined,
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { scraper?: string; titles?: string[]; locations?: string[] };
  const scraperName = body.scraper ?? "";

  const config: SearchConfigData = {
    ...DEFAULT_CONFIG,
    titles: body.titles ?? DEFAULT_CONFIG.titles,
    locations: body.locations ?? DEFAULT_CONFIG.locations,
  };

  const all = createScrapers();
  const target = all.find((s) => s.name === scraperName || s.name.startsWith(scraperName));

  if (!target) {
    const available = all.map((s) => s.name);
    return NextResponse.json({ error: `Scraper "${scraperName}" not found`, available }, { status: 400 });
  }

  if (!target.enabled) {
    return NextResponse.json({ error: `Scraper "${target.name}" is disabled (missing credentials)` }, { status: 400 });
  }

  const start = Date.now();
  try {
    const result = await target.scrape(config);
    return NextResponse.json({
      scraper: target.name,
      config: { titles: config.titles, locations: config.locations },
      jobs: result.jobs.slice(0, 20), // cap at 20 to keep response small
      totalJobs: result.jobs.length,
      errors: result.errors,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return NextResponse.json({
      scraper: target.name,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    }, { status: 500 });
  }
}
