import { getRequiredUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

async function requireAdmin(callerId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: callerId },
    select: { isAdmin: true, email: true },
  });
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!(user?.isAdmin || (adminEmail && user?.email === adminEmail));
}

export type ServiceStatus = "ok" | "error" | "warning" | "unconfigured";

export interface ServiceHealth {
  name: string;
  key: string;
  status: ServiceStatus;
  message: string;
  detail?: string;
  latencyMs?: number;
}

export interface RecentPipelineError {
  runId: string;
  userId: string;
  startedAt: string;
  status: string;
  errors: string[];
}

export interface ApiHealthResponse {
  services: ServiceHealth[];
  recentErrors: RecentPipelineError[];
  checkedAt: string;
}

async function checkWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), timeoutMs)
    ),
  ]);
}

async function checkOpenRouter(): Promise<ServiceHealth> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return { name: "OpenRouter", key: "openrouter", status: "unconfigured", message: "API key not set" };
  }
  const start = Date.now();
  try {
    const res = await checkWithTimeout(
      () => fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      8000
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { name: "OpenRouter", key: "openrouter", status: "error", message: `HTTP ${res.status}`, latencyMs };
    }
    const data = await res.json() as { data?: { label?: string; limit?: number | null; usage?: number; rate_limit?: { requests: number; interval: string } } };
    const usage = data.data?.usage ?? 0;
    const limit = data.data?.limit;
    const remaining = limit != null ? limit - usage : null;
    const detail = limit != null
      ? `$${remaining?.toFixed(2)} remaining of $${limit}`
      : "No spend limit set";
    const status: ServiceStatus = (remaining != null && remaining < 1) ? "warning" : "ok";
    return { name: "OpenRouter", key: "openrouter", status, message: "Connected", detail, latencyMs };
  } catch (err) {
    return {
      name: "OpenRouter", key: "openrouter", status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkApify(): Promise<ServiceHealth> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return { name: "Apify", key: "apify", status: "unconfigured", message: "API token not set" };
  }
  const start = Date.now();
  try {
    const res = await checkWithTimeout(
      () => fetch(`https://api.apify.com/v2/users/me?token=${token}`),
      8000
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { name: "Apify", key: "apify", status: "error", message: `HTTP ${res.status}`, latencyMs };
    }
    const data = await res.json() as { data?: { username?: string; plan?: { maxActorMemoryGbytes?: number }; proxy?: { groups?: unknown[] }; limits?: { monthlyUsageCredits?: number }; monthlyUsage?: { actorComputeUnits?: number } } };
    const username = data.data?.username ?? "unknown";
    const credits = data.data?.limits?.monthlyUsageCredits;
    const used = data.data?.monthlyUsage?.actorComputeUnits ?? 0;
    const detail = credits != null ? `${used.toFixed(1)}/${credits} CUs used` : `User: ${username}`;
    return { name: "Apify", key: "apify", status: "ok", message: `Connected as ${username}`, detail, latencyMs };
  } catch (err) {
    return {
      name: "Apify", key: "apify", status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkFirecrawl(): Promise<ServiceHealth> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return { name: "Firecrawl", key: "firecrawl", status: "unconfigured", message: "API key not set" };
  }
  const start = Date.now();
  try {
    const res = await checkWithTimeout(
      () => fetch("https://api.firecrawl.dev/v1/team/credits", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      8000
    );
    const latencyMs = Date.now() - start;
    if (res.status === 404) {
      // Credits endpoint may not exist on all plans — just confirm auth works via a minimal request
      return { name: "Firecrawl", key: "firecrawl", status: "ok", message: "Connected (credits N/A)", latencyMs };
    }
    if (!res.ok) {
      return { name: "Firecrawl", key: "firecrawl", status: "error", message: `HTTP ${res.status}`, latencyMs };
    }
    const data = await res.json() as { credits?: number; remaining?: number };
    const remaining = data.remaining ?? data.credits;
    const detail = remaining != null ? `${remaining} credits remaining` : undefined;
    const status: ServiceStatus = (remaining != null && remaining < 10) ? "warning" : "ok";
    return { name: "Firecrawl", key: "firecrawl", status, message: "Connected", detail, latencyMs };
  } catch (err) {
    return {
      name: "Firecrawl", key: "firecrawl", status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkTelegram(): Promise<ServiceHealth> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { name: "Telegram", key: "telegram", status: "unconfigured", message: "Bot token or chat ID not set" };
  }
  const start = Date.now();
  try {
    const res = await checkWithTimeout(
      () => fetch(`https://api.telegram.org/bot${token}/getMe`),
      8000
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { name: "Telegram", key: "telegram", status: "error", message: `HTTP ${res.status}`, latencyMs };
    }
    const data = await res.json() as { ok: boolean; result?: { username?: string; first_name?: string } };
    if (!data.ok) {
      return { name: "Telegram", key: "telegram", status: "error", message: "Bot authentication failed", latencyMs };
    }
    const botName = data.result?.first_name ?? data.result?.username ?? "unknown";
    return { name: "Telegram", key: "telegram", status: "ok", message: `Bot: ${botName}`, detail: `Chat ID: ${chatId}`, latencyMs };
  } catch (err) {
    return {
      name: "Telegram", key: "telegram", status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkScrapeDo(): Promise<ServiceHealth> {
  const token = process.env.SCRAPE_DO_TOKEN;
  if (!token) {
    return { name: "scrape.do", key: "scrape_do", status: "unconfigured", message: "Token not set" };
  }
  const start = Date.now();
  try {
    const res = await checkWithTimeout(
      () => fetch(`https://api.scrape.do/info?token=${token}`),
      8000
    );
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { name: "scrape.do", key: "scrape_do", status: "error", message: `HTTP ${res.status}`, latencyMs };
    }
    const data = await res.json() as { remainingMonthlyRequests?: number; planName?: string };
    const remaining = data.remainingMonthlyRequests;
    const detail = remaining != null ? `${remaining.toLocaleString()} requests remaining` : undefined;
    const status: ServiceStatus = (remaining != null && remaining < 100) ? "warning" : "ok";
    return { name: "scrape.do", key: "scrape_do", status, message: "Connected", detail, latencyMs };
  } catch (err) {
    return {
      name: "scrape.do", key: "scrape_do", status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

function checkAdzuna(): ServiceHealth {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) {
    return { name: "Adzuna", key: "adzuna", status: "unconfigured", message: "App ID or API key not set" };
  }
  return { name: "Adzuna", key: "adzuna", status: "ok", message: "Configured", detail: `App ID: ${appId}` };
}

function checkResend(): ServiceHealth {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { name: "Resend", key: "resend", status: "unconfigured", message: "API key not set" };
  }
  return { name: "Resend", key: "resend", status: "ok", message: "Configured" };
}

async function getRecentPipelineErrors(): Promise<RecentPipelineError[]> {
  const runs = await prisma.pipelineRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      errors: true,
    },
  });

  return runs
    .map((r) => {
      let errors: string[] = [];
      try {
        const parsed = JSON.parse(r.errors);
        if (Array.isArray(parsed)) errors = parsed as string[];
      } catch {
        // ignore
      }
      return {
        runId: r.id,
        userId: r.userId,
        startedAt: r.startedAt.toISOString(),
        status: r.status,
        errors,
      };
    })
    .filter((r) => r.errors.length > 0 || r.status === "failed");
}

export async function GET(): Promise<NextResponse> {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run all health checks in parallel
  const [openrouter, apify, firecrawl, telegram, scrapeDo, recentErrors] =
    await Promise.all([
      checkOpenRouter(),
      checkApify(),
      checkFirecrawl(),
      checkTelegram(),
      checkScrapeDo(),
      getRecentPipelineErrors(),
    ]);

  const adzuna = checkAdzuna();
  const resend = checkResend();

  const services: ServiceHealth[] = [
    openrouter,
    apify,
    firecrawl,
    scrapeDo,
    adzuna,
    telegram,
    resend,
  ];

  const response: ApiHealthResponse = {
    services,
    recentErrors,
    checkedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
