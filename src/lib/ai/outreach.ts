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

export interface OutreachInput {
  companyUrl: string;
  resumeText: string;
  resumeName?: string;
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

async function fetchCompanyPage(url: string): Promise<{ rawText: string; meta: ReturnType<typeof extractMeta> }> {
  // Normalise URL
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

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

function buildPrompt(
  companyUrl: string,
  pageText: string,
  meta: { title: string; description: string; ogDescription: string },
  resumeText: string
): string {
  const context = [
    meta.title && `Page title: ${meta.title}`,
    meta.description && `Meta description: ${meta.description}`,
    meta.ogDescription && `OG description: ${meta.ogDescription}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a career coach helping a candidate write a compelling cold outreach email to a company they want to work for. This company doesn't have open roles but invites people to reach out.

Your task:
1. Research the company from the page content below
2. Generate a personalized, genuine cold outreach email using the candidate's resume

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
- Tone: professional, warm, confident — not desperate
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
  const companyName = meta.title.split(/[-|–]/)[0].trim() || new URL(
    input.companyUrl.startsWith("http") ? input.companyUrl : `https://${input.companyUrl}`
  ).hostname.replace("www.", "");

  const nameLines = input.resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  const candidateName = nameLines[0] ?? "Your Name";

  return {
    companyName,
    companyInfo: {
      name: companyName,
      description: "Company information could not be extracted. Please add your GROK_API_KEY for full AI-powered research.",
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

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3",
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
      const prompt = buildPrompt(input.companyUrl, rawText, meta, input.resumeText);
      const text = await callGrok(prompt);
      return parseResponse(text);
    } catch (err) {
      console.error("[outreach] Grok API error, falling back:", err);
    }
  }

  return generateFallback(input, meta);
}
