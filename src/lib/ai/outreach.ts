export interface CompanyInfo {
  name: string;
  description: string;
  techStack: string[];
  culture: string[];
  industry: string;
  size: string;
  highlights: string[]; // interesting things to reference in email
}

export interface OutreachResult {
  companyName: string;
  companyInfo: CompanyInfo;
  emailSubject: string;
  emailBody: string;
}

export type OutreachTone = "Professional" | "Friendly" | "Confident" | "Concise";

export interface OutreachInput {
  companyUrl: string;
  resumeText: string;
  resumeName?: string;
  candidateName?: string;
  tone?: OutreachTone;
}

// ─── HTML scraping ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractMeta(html: string): { title: string; description: string; ogDescription: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

  return {
    title: titleMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    ogDescription: ogMatch?.[1]?.trim() ?? "",
  };
}

/** Private/reserved IP ranges that must never be fetched (SSRF prevention) */
const BLOCKED_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / cloud metadata
  /^::1$/,       // IPv6 loopback
  /^fc00:/i,     // IPv6 private
  /^fe80:/i,     // IPv6 link-local
];

function validatePublicHttpsUrl(raw: string): string {
  // Force https:// prefix if missing scheme
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new Error("Invalid company URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Only https:// URLs are allowed");
  }

  const host = parsed.hostname.toLowerCase();
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(host)) {
      throw new Error("URL points to a private or reserved address");
    }
  }

  return parsed.toString();
}

async function fetchCompanyPage(url: string): Promise<{ rawText: string; meta: ReturnType<typeof extractMeta> }> {
  const fullUrl = validatePublicHttpsUrl(url);

  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobHunterBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${fullUrl}: ${res.status}`);
  }

  const html = await res.text();
  const meta = extractMeta(html);
  const rawText = stripHtml(html);

  return { rawText, meta };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const TONE_INSTRUCTIONS: Record<OutreachTone, string> = {
  Professional: "professional, warm, and confident — polished and respectful, suitable for senior roles or formal companies",
  Friendly: "friendly and conversational — approachable and personable, like writing to a colleague you'd like to meet",
  Confident: "confident and direct — assertive without being arrogant, lead with impact and value",
  Concise: "concise and to the point — keep it short (under 120 words), every sentence must earn its place",
};

function buildPrompt(
  companyUrl: string,
  pageText: string,
  meta: { title: string; description: string; ogDescription: string },
  resumeText: string,
  tone: OutreachTone = "Professional"
): string {
  const context = [
    meta.title && `Page title: ${meta.title}`,
    meta.description && `Meta description: ${meta.description}`,
    meta.ogDescription && `OG description: ${meta.ogDescription}`,
  ]
    .filter(Boolean)
    .join("\n");

  const toneInstruction = TONE_INSTRUCTIONS[tone];

  return `You are a career coach helping a candidate write a compelling cold outreach email to a company they want to work for. This company doesn't have open roles but invites people to reach out.

Your task:
1. Research the company from the page content below
2. Generate a personalized, genuine cold outreach email using the candidate's resume

Email tone: ${tone} — ${toneInstruction}

Return ONLY valid JSON (no markdown, no extra text) in this exact format:
{
  "companyName": "Company Name",
  "companyInfo": {
    "name": "Company Name",
    "description": "2-3 sentence summary of what the company does",
    "techStack": ["tech1", "tech2"],
    "culture": ["remote-friendly", "mission-driven", "..."],
    "industry": "SaaS / Fintech / Healthcare / ...",
    "size": "startup / scale-up / mid-size / enterprise",
    "highlights": ["specific interesting thing 1", "specific interesting thing 2"]
  },
  "emailSubject": "Concise, specific subject line (not generic, reference something real about the company)",
  "emailBody": "Full email body — 150-200 words. Structure:\\n\\nHi [Hiring Manager / Team],\\n\\n[Opening: specific reference to company mission, product, or something you genuinely admire — 1-2 sentences]\\n\\n[Middle: connect candidate's most relevant background to what the company is building — be specific, name 1-2 skills or achievements from their resume that align — 2-3 sentences]\\n\\n[Close: soft CTA, express interest in a conversation, not begging for a job — 1-2 sentences]\\n\\nBest,\\n[Name]"
}

Rules:
- emailSubject must be specific to THIS company, not generic ("Interested in joining your team" is bad)
- emailBody must NOT sound like a template — reference something real from the company page
- Strictly apply the requested tone throughout the entire email: ${tone} — ${toneInstruction}
- Do NOT fabricate companies/roles — only use what is in the candidate's resume
- If tech stack is unclear from the page, infer from context (e.g. a fintech startup likely uses cloud infra, APIs)

Company URL: ${companyUrl}

Page metadata:
${context || "(no metadata found)"}

Company page content (first 3000 chars):
${pageText.slice(0, 3000)}

Candidate Resume:
${resumeText.slice(0, 3000)}`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseResponse(text: string): OutreachResult {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  const info = parsed.companyInfo ?? {};

  return {
    companyName: String(parsed.companyName ?? info.name ?? "Unknown Company"),
    companyInfo: {
      name: String(info.name ?? parsed.companyName ?? ""),
      description: String(info.description ?? ""),
      techStack: Array.isArray(info.techStack) ? info.techStack.map(String) : [],
      culture: Array.isArray(info.culture) ? info.culture.map(String) : [],
      industry: String(info.industry ?? ""),
      size: String(info.size ?? ""),
      highlights: Array.isArray(info.highlights) ? info.highlights.map(String) : [],
    },
    emailSubject: String(parsed.emailSubject ?? ""),
    emailBody: String(parsed.emailBody ?? ""),
  };
}

// ─── Fallback ──────────────────────────────────────────────────────────────────

function generateFallback(input: OutreachInput, meta: { title: string }): OutreachResult {
  let companyNameFallback = meta.title.split(/[-|–]/)[0].trim();
  if (!companyNameFallback) {
    try {
      companyNameFallback = new URL(validatePublicHttpsUrl(input.companyUrl)).hostname.replace("www.", "");
    } catch {
      companyNameFallback = "the company";
    }
  }
  const companyName = companyNameFallback;

  // Prefer profile name, fall back to first line of resume
  const nameLines = input.resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidateName = input.candidateName || nameLines[0] || "Your Name";

  return {
    companyName,
    companyInfo: {
      name: companyName,
      description: "Company information could not be extracted. AI-powered research is unavailable — please configure your AI API key in settings.",
      techStack: [],
      culture: [],
      industry: "",
      size: "",
      highlights: [],
    },
    emailSubject: `Interest in joining ${companyName}`,
    emailBody: `Hi ${companyName} Team,\n\nI came across ${companyName} and was impressed by your work. I'm reaching out because I'd love to explore whether there might be a fit for my skills on your team.\n\nMy background spans software development and I'd welcome any conversation about how I might contribute.\n\nWould you be open to a brief chat?\n\nBest,\n${candidateName}`,
  };
}

// ─── Grok API call ────────────────────────────────────────────────────────────

async function callGrok(prompt: string): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateOutreachEmail(input: OutreachInput): Promise<OutreachResult> {
  // Step 1: Fetch the company page
  let rawText = "";
  let meta = { title: "", description: "", ogDescription: "" };

  try {
    const fetched = await fetchCompanyPage(input.companyUrl);
    rawText = fetched.rawText;
    meta = fetched.meta;
  } catch (err) {
    console.error("[outreach] Failed to fetch company page:", err);
    // Proceed with empty content — Grok will work from URL alone
  }

  // Step 2: Call Grok to research + generate
  if (process.env.GROK_API_KEY) {
    try {
      const prompt = buildPrompt(input.companyUrl, rawText, meta, input.resumeText, input.tone ?? "Professional");
      const text = await callGrok(prompt);
      return parseResponse(text);
    } catch (err) {
      console.error("[outreach] Grok API error, falling back:", err);
    }
  }

  return generateFallback(input, meta);
}
