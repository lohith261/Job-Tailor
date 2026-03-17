export interface CoverLetterInput {
  resumeText: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  tone: "professional" | "conversational" | "enthusiastic";
}

// ─── Grok API call ─────────────────────────────────────────────────────────────

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
    signal: AbortSignal.timeout(30_000),
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

// ─── Prompt builder ────────────────────────────────────────────────────────────

const TONE_INSTRUCTIONS: Record<CoverLetterInput["tone"], string> = {
  professional:
    "formal but warm — respectful, confident, polished language that fits a corporate setting",
  conversational:
    "first-person, accessible and approachable — like a thoughtful colleague explaining why they're excited about the role",
  enthusiastic:
    "energetic and bold — show genuine passion, use active language, slightly more expressive while remaining credible",
};

function buildPrompt(input: CoverLetterInput): string {
  const { resumeText, jobTitle, company, jobDescription, tone } = input;

  return `You are a professional career coach writing a cover letter on behalf of a job applicant.

Write a compelling, personalized cover letter for the following role.

TONE: ${TONE_INSTRUCTIONS[tone]}

REQUIREMENTS:
- Length: 3-4 paragraphs, under 350 words total
- Opening paragraph: a strong hook that connects the applicant's specific background to this company or role — do NOT start with "I am writing to apply for" or similar generic openers
- Body paragraphs: draw 2-3 concrete accomplishments or skills directly from the resume that match the job description; reference specific technologies, domains, or responsibilities mentioned in the job
- Closing paragraph: forward-looking, express genuine enthusiasm for this specific company, clear call to action
- Do NOT include subject line, date, address blocks, or salutation — return only the body paragraphs
- Do NOT use placeholder text like [Your Name] or [Date] — write as if already filled in
- Do NOT use markdown formatting — plain paragraphs only

Job Title: ${jobTitle}
Company: ${company}

Job Description (first 2500 characters):
${jobDescription.slice(0, 2500)}

Applicant Resume (first 3500 characters):
${resumeText.slice(0, 3500)}

Return ONLY the cover letter body text — no extra commentary, no titles, no markdown.`;
}

// ─── Fallback (no API key) ─────────────────────────────────────────────────────

function generateFallback(input: CoverLetterInput): string {
  const { jobTitle, company } = input;
  return `Thank you for considering this application for the ${jobTitle} position at ${company}.

My background aligns closely with the requirements of this role. I have developed strong technical and collaborative skills that I am eager to bring to your team, and I am confident in my ability to contribute meaningfully from day one.

I am particularly drawn to ${company} because of its reputation for innovation and the opportunity to work alongside talented professionals in this domain. I would welcome the chance to discuss how my experience can support your team's goals.

[Note: AI-powered cover letter generation requires GROK_API_KEY to be configured. Please add your xAI key to the environment variables to enable personalized cover letters.]`;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function generateCoverLetter(
  input: CoverLetterInput
): Promise<string> {
  if (process.env.GROK_API_KEY) {
    try {
      return await callGrok(buildPrompt(input));
    } catch (err) {
      console.error("[generateCoverLetter] Grok API error, using fallback:", err);
    }
  }

  return generateFallback(input);
}
