// scrape.do proxy utility — routes requests through scrape.do's proxy network
// to bypass anti-scraping measures. Token set via SCRAPE_DO_TOKEN env var.
// Docs: https://scrape.do

const SCRAPE_DO_BASE = "https://api.scrape.do";

export function isScrapeDOEnabled(): boolean {
  return !!process.env.SCRAPE_DO_TOKEN;
}

export async function scrapeDOFetch(
  targetUrl: string,
  options: {
    render?: boolean;          // render JavaScript via headless browser
    waitUntil?: "load" | "domcontentloaded" | "networkidle"; // when to consider render done
    customWait?: number;       // additional ms to wait after render
    super?: boolean;           // residential/mobile proxies for challenging sites
    geoCode?: string;          // target country e.g. "in", "us"
    timeoutMs?: number;        // total timeout (sent to scrape.do + client AbortSignal)
    extraHeaders?: Record<string, string>; // headers forwarded to target site
  } = {}
): Promise<string> {
  const token = process.env.SCRAPE_DO_TOKEN;
  if (!token) throw new Error("SCRAPE_DO_TOKEN not set");

  const timeoutMs = options.timeoutMs ?? 60000;

  const params = new URLSearchParams({ token, url: targetUrl });

  if (options.render) {
    params.set("render", "true");
    params.set("waitUntil", options.waitUntil ?? "networkidle");
    if (options.customWait) params.set("customWait", String(options.customWait));
  }
  if (options.super) params.set("super", "true");
  if (options.geoCode) params.set("geoCode", options.geoCode);

  // Pass timeout to scrape.do so it waits on their end too
  params.set("timeout", String(timeoutMs));

  // customHeaders=true tells scrape.do to forward our headers to the target
  const hasExtraHeaders = options.extraHeaders && Object.keys(options.extraHeaders).length > 0;
  if (hasExtraHeaders) params.set("customHeaders", "true");

  const proxyUrl = `${SCRAPE_DO_BASE}?${params.toString()}`;

  const res = await fetch(proxyUrl, {
    headers: hasExtraHeaders ? options.extraHeaders : {},
    signal: AbortSignal.timeout(timeoutMs + 5000), // client timeout slightly longer than scrape.do's
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`scrape.do returned ${res.status} for ${targetUrl}: ${body.slice(0, 200)}`);
  }

  return res.text();
}
