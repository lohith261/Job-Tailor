import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";

// Module-level cache — prevents hammering third-party APIs on every request.
// Works per serverless instance; CDN s-maxage handles cross-instance dedup.
let cachedAt = 0;
let cachedPayload: unknown = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

export interface ScraperStatusResult {
  name: string;
  label: string;
  status: "ok" | "error" | "disabled";
  latencyMs?: number;
  message: string;
  requiresKey: boolean;
  keyConfigured: boolean;
  description: string;
}

interface PingResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

async function pingHead(url: string, timeoutMs = 6000): Promise<PingResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "JobTailor/1.0 (+https://github.com/lohith261/job-tailor)" },
    });
    // 2xx or 3xx = reachable, 4xx may still mean server is up
    return { ok: res.status < 500, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Request failed",
    };
  }
}

async function pingGet(url: string, timeoutMs = 6000): Promise<PingResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "JobTailor/1.0 (+https://github.com/lohith261/job-tailor)",
        Accept: "application/json",
      },
    });
    return { ok: res.ok, latencyMs: Date.now() - start };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Request failed",
    };
  }
}

const SOURCES = [
  {
    name: "remoteok",
    label: "RemoteOK",
    requiresKey: false,
    description: "Remote tech jobs. Free public API.",
  },
  {
    name: "remotive",
    label: "Remotive",
    requiresKey: false,
    description: "Curated remote jobs. Free public API.",
  },
  {
    name: "arbeitnow",
    label: "Arbeitnow",
    requiresKey: false,
    description: "European & remote jobs. Free public API.",
  },
  {
    name: "jobicy",
    label: "Jobicy",
    requiresKey: false,
    description: "Remote-only job board. Free public API.",
  },
  {
    name: "themuse",
    label: "The Muse",
    requiresKey: false,
    description: "494K+ jobs across tech categories. Free public API.",
  },
  {
    name: "adzuna",
    label: "Adzuna",
    requiresKey: true,
    description: "Multi-country job index (US, GB, IN, AU, CA). Free API key required.",
  },
];

export async function GET() {
  // Auth guard — only authenticated users can check scraper status
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;

  // Serve from cache if still fresh
  const now = Date.now();
  if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "private, max-age=60, s-maxage=60",
        "X-Cache": "HIT",
      },
    });
  }

  const adzunaAppId = process.env.ADZUNA_APP_ID ?? "";
  const adzunaApiKey = process.env.ADZUNA_API_KEY ?? "";
  const adzunaConfigured = !!(adzunaAppId && adzunaApiKey);

  // Run all health checks in parallel
  const checks = await Promise.allSettled([
    // RemoteOK — HEAD to avoid triggering rate limit
    pingHead("https://remoteok.com/"),
    // Remotive — minimal category fetch
    pingGet("https://remotive.com/api/remote-jobs?category=software-dev&limit=1"),
    // Arbeitnow — page 1
    pingGet("https://www.arbeitnow.com/api/job-board-api?page=1"),
    // Jobicy — count=1
    pingGet("https://jobicy.com/api/v2/remote-jobs?count=1"),
    // The Muse — page 1
    pingGet("https://www.themuse.com/api/public/jobs?page=1"),
    // Adzuna — real API ping only if keys configured
    adzunaConfigured
      ? pingGet(
          `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${adzunaAppId}&app_key=${adzunaApiKey}&results_per_page=1&content-type=application/json`
        )
      : Promise.resolve<PingResult>({ ok: false, latencyMs: 0, error: "No API keys configured" }),
  ]);

  const results: ScraperStatusResult[] = SOURCES.map((src, i) => {
    const isAdzuna = src.name === "adzuna";
    const keyConfigured = !src.requiresKey || (isAdzuna && adzunaConfigured);

    // Disabled: requires key but not configured
    if (src.requiresKey && !keyConfigured) {
      return {
        ...src,
        keyConfigured: false,
        status: "disabled",
        message: "Set ADZUNA_APP_ID and ADZUNA_API_KEY environment variables to enable",
      };
    }

    const check = checks[i];
    if (check.status === "rejected") {
      return {
        ...src,
        keyConfigured,
        status: "error",
        latencyMs: 0,
        message: "Check failed unexpectedly",
      };
    }

    const { ok, latencyMs, error } = check.value;
    return {
      ...src,
      keyConfigured,
      status: ok ? "ok" : "error",
      latencyMs,
      message: ok ? "Online" : (error ?? "Unreachable"),
    };
  });

  const payload = { sources: results, checkedAt: new Date().toISOString() };

  // Store in module-level cache
  cachedPayload = payload;
  cachedAt = now;

  return NextResponse.json(payload, {
    headers: {
      // CDN caches for 60s; browsers treat as private (user-specific auth)
      "Cache-Control": "private, max-age=60, s-maxage=60",
      "X-Cache": "MISS",
    },
  });
}
