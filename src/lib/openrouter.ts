/**
 * Shared OpenRouter client — drop-in replacement for the per-file Grok callers.
 *
 * Model tiers (cheapest → best quality):
 *   google/gemini-2.0-flash-lite-001  ~$0.04/M tokens  — fast analysis
 *   google/gemini-2.0-flash-001      ~$0.10/M tokens  — writing tasks
 *   meta-llama/llama-3.3-70b-instruct  ~$0.12/M tokens — complex generation
 *
 * Override the default model globally with OPENROUTER_MODEL env var.
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";

/** Retry with exponential backoff. Only retries on transient errors (network / 429 / 5xx). */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  baseDelayMs: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransient =
        err instanceof TypeError || // network failure
        (err instanceof Error && /^OpenRouter API error (429|5\d\d)/.test(err.message));
      if (!isTransient || attempt === retries) throw err;
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export const MODELS = {
  /** Fast + cheap — good for structured JSON analysis */
  fast: "google/gemini-2.0-flash-lite-001",
  /** Balanced — better writing quality, still cheap */
  balanced: "google/gemini-2.0-flash-001",
  /** High quality — complex resume / cover letter generation */
  quality: "meta-llama/llama-3.3-70b-instruct",
} as const;

export type OpenRouterModel = (typeof MODELS)[keyof typeof MODELS];

export async function callOpenRouter(
  prompt: string,
  options: {
    model?: OpenRouterModel | string;
    maxTokens?: number;
    timeoutMs?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const model =
    options.model ??
    process.env.OPENROUTER_MODEL ??
    MODELS.balanced;

  const data = await withRetry(async () => {
    const res = await fetch(OPENROUTER_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://jobtailor.in",
        "X-Title": "Job Tailor",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<{ choices: Array<{ message: { content: string } }> }>;
  }, 3, 2000);

  return data.choices[0]?.message?.content ?? "";
}
