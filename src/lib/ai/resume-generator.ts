export interface ResumeContact {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  location: string;
}

export interface ResumeSkills {
  languages: string[];
  frameworks: string[];
  tools: string[];
  databases: string[];
  other: string[];
}

export interface ResumeExperience {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ResumeEducation {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  highlights: string[];
}

export interface ResumeProject {
  name: string;
  tech: string;
  link: string;
  bullets: string[];
}

export interface GeneratedResumeData {
  contact: ResumeContact;
  summary: string;
  skills: ResumeSkills;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects: ResumeProject[];
  certifications: string[];
  projectedScore: number;
}

export interface GenerateResumeInput {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  jobTags: string[];
  jobCompany: string;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(input: GenerateResumeInput): string {
  const { resumeText, jobTitle, jobDescription, jobTags, jobCompany } = input;

  return `You are an expert ATS resume writer. Create a tailored, ATS-optimized resume for this specific job by rewriting the candidate's existing resume content.

CRITICAL RULES:
1. NEVER fabricate companies, job titles, schools, or degrees — use ONLY what exists in the candidate's resume
2. You MAY rewrite bullet points to use the job's terminology and highlight relevant achievements
3. You MUST include exact keywords from the job description naturally throughout
4. Quantify achievements — add realistic metrics if the resume has vague bullets (e.g., "reduced latency by ~30%")
5. Mirror the job description's exact technical terminology (same casing, same phrasing)
6. The skills section MUST list every relevant technology mentioned in the JD that the candidate has experience with
7. Write a targeted professional summary that uses the exact job title and top 3 requirements
8. Order experience bullets to lead with the most JD-relevant achievements
9. Target a projected ATS match score of 90+

Return ONLY valid JSON (no markdown fences, no extra text) in this exact format:
{
  "contact": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+1 (555) 000-0000",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "location": "City, State / Country"
  },
  "summary": "2-3 sentence professional summary using the exact job title '${jobTitle}' and mirroring the top requirements",
  "skills": {
    "languages": ["exact names from JD that candidate knows"],
    "frameworks": ["exact framework names from JD"],
    "tools": ["exact tool names from JD and resume"],
    "databases": ["exact database names"],
    "other": ["methodologies, practices, soft skills relevant to JD"]
  },
  "experience": [
    {
      "company": "Exact company name from resume",
      "title": "Job title from resume",
      "location": "City, ST or Remote",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY or Present",
      "bullets": [
        "Strong action verb + what you did + technology from JD + quantified outcome",
        "..."
      ]
    }
  ],
  "education": [
    {
      "school": "University name",
      "degree": "Bachelor/Master/PhD of ...",
      "field": "Field of Study",
      "startDate": "Mon YYYY",
      "endDate": "Mon YYYY",
      "gpa": "X.X/4.0 or empty string",
      "highlights": ["Relevant coursework or honors if any, else empty array"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": "Comma-separated tech stack",
      "link": "github.com/... or empty string",
      "bullets": ["What it does + tech used + impact/scale"]
    }
  ],
  "certifications": ["Certification name — Issuer, Year"],
  "projectedScore": <integer 85-99>
}

Target Company: ${jobCompany}
Job Title: ${jobTitle}
Required Skills/Tags: ${jobTags.join(", ") || "see description"}

Job Description:
${jobDescription.slice(0, 3500)}

Candidate's Resume:
${resumeText.slice(0, 4000)}`;
}

// ─── Response parser ─────────────────────────────────────────────────────────

function parseResponse(text: string): GeneratedResumeData {
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  const contact: ResumeContact = {
    name: String(parsed.contact?.name ?? ""),
    email: String(parsed.contact?.email ?? ""),
    phone: String(parsed.contact?.phone ?? ""),
    linkedin: String(parsed.contact?.linkedin ?? ""),
    github: String(parsed.contact?.github ?? ""),
    location: String(parsed.contact?.location ?? ""),
  };

  const skills: ResumeSkills = {
    languages: toStrArray(parsed.skills?.languages),
    frameworks: toStrArray(parsed.skills?.frameworks),
    tools: toStrArray(parsed.skills?.tools),
    databases: toStrArray(parsed.skills?.databases),
    other: toStrArray(parsed.skills?.other),
  };

  const experience: ResumeExperience[] = (Array.isArray(parsed.experience) ? parsed.experience : []).map(
    (e: Record<string, unknown>) => ({
      company: String(e.company ?? ""),
      title: String(e.title ?? ""),
      location: String(e.location ?? ""),
      startDate: String(e.startDate ?? ""),
      endDate: String(e.endDate ?? ""),
      bullets: toStrArray(e.bullets),
    })
  );

  const education: ResumeEducation[] = (Array.isArray(parsed.education) ? parsed.education : []).map(
    (e: Record<string, unknown>) => ({
      school: String(e.school ?? ""),
      degree: String(e.degree ?? ""),
      field: String(e.field ?? ""),
      startDate: String(e.startDate ?? ""),
      endDate: String(e.endDate ?? ""),
      gpa: String(e.gpa ?? ""),
      highlights: toStrArray(e.highlights),
    })
  );

  const projects: ResumeProject[] = (Array.isArray(parsed.projects) ? parsed.projects : []).map(
    (p: Record<string, unknown>) => ({
      name: String(p.name ?? ""),
      tech: String(p.tech ?? ""),
      link: String(p.link ?? ""),
      bullets: toStrArray(p.bullets),
    })
  );

  return {
    contact,
    summary: String(parsed.summary ?? ""),
    skills,
    experience,
    education,
    projects,
    certifications: toStrArray(parsed.certifications),
    projectedScore: Math.min(99, Math.max(0, Math.round(Number(parsed.projectedScore) || 85))),
  };
}

function toStrArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(String).filter(Boolean);
}

// ─── Fallback when no API key ─────────────────────────────────────────────────

function generateFallback(input: GenerateResumeInput): GeneratedResumeData {
  // Parse basic contact info from resume text via regex
  const emailMatch = input.resumeText.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = input.resumeText.match(/(\+?[\d\s\-().]{10,})/);
  const linkedinMatch = input.resumeText.match(/linkedin\.com\/in\/[\w-]+/i);
  const githubMatch = input.resumeText.match(/github\.com\/[\w-]+/i);
  const lines = input.resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  const name = lines[0] ?? "Your Name";

  // Extract skills from resume text that match job tags
  const resumeLower = input.resumeText.toLowerCase();
  const matchedTags = input.jobTags.filter((t) => resumeLower.includes(t.toLowerCase()));

  return {
    contact: {
      name,
      email: emailMatch?.[0] ?? "",
      phone: phoneMatch?.[0]?.trim() ?? "",
      linkedin: linkedinMatch?.[0] ?? "",
      github: githubMatch?.[0] ?? "",
      location: "",
    },
    summary: `Experienced professional seeking the ${input.jobTitle} role at ${input.jobCompany}. Bringing expertise in ${matchedTags.slice(0, 3).join(", ") || "relevant technologies"} with a track record of delivering impactful solutions.`,
    skills: {
      languages: [],
      frameworks: [],
      tools: matchedTags,
      databases: [],
      other: [],
    },
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    projectedScore: 75,
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
      max_tokens: 4096,
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

export async function generateTailoredResume(
  input: GenerateResumeInput
): Promise<GeneratedResumeData> {
  if (process.env.GROK_API_KEY) {
    try {
      const text = await callGrok(buildPrompt(input));
      return parseResponse(text);
    } catch (err) {
      console.error("[generateTailoredResume] Grok API error, falling back:", err);
    }
  }
  return generateFallback(input);
}
