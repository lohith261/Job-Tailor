# Custom Job Finder

A self-hosted, AI-powered job search assistant that scrapes live job listings, scores them against your personal preferences, generates cover letters, tailors your resume, and tracks every application — all in a persistent PostgreSQL database. Supports multiple independent user accounts.

**Live demo:** https://custom-job-finder.vercel.app

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Tech Stack](#tech-stack)
3. [How Authentication Works](#how-authentication-works)
4. [End-to-End User Guide](#end-to-end-user-guide)
5. [Architecture Overview](#architecture-overview)
6. [Database Schema](#database-schema)
7. [Scoring Engine](#scoring-engine)
8. [AI Features](#ai-features)
9. [API Reference](#api-reference)
10. [Project Structure](#project-structure)
11. [Local Development Setup](#local-development-setup)
12. [Deploying to Vercel](#deploying-to-vercel)
13. [Environment Variables](#environment-variables)
14. [How Each Feature Works](#how-each-feature-works)

---

## What It Does

| Module | Description |
|--------|-------------|
| **Opportunity Inbox** | Scrapes RemoteOK, Remotive, Arbeitnow, Jobicy, The Muse, and Adzuna for live jobs. Scores each one against your search config and surfaces Quick Wins and Best Bets. |
| **Application Tracker** | Kanban board (Bookmarked → Applied → Interview → Offer → Rejected) with recruiter notes, follow-up reminders, and a full event timeline. |
| **Resume Tailoring** | Upload PDF/DOCX/TXT resumes. Run AI analysis against any job to get a match score, present/missing keywords, and rewrite suggestions. Generate a fully tailored LaTeX resume for a specific role. |
| **Cover Letters** | One-click AI-generated cover letters for any job, personalised from your resume and the job description. |
| **Cold Outreach** | Enter any company URL and get an AI-written personalised outreach email, researched from the company's public web presence. |
| **Automation Pipeline** | One-click full automation: scrape → score → analyse → generate cover letters → auto-track applications. Configurable score threshold and tone. |
| **Analytics Dashboard** | Application funnel, match score distribution, weekly trend charts, top titles/companies, source conversions, and resume performance — all computed server-side from live data. |
| **Search Config** | Persist your target titles, locations, salary range, required keywords, excluded keywords, and blacklisted companies. Feeds directly into the scoring engine. |
| **My Profile** | Store your name, email, phone, LinkedIn, GitHub, and location. Used to personalise AI-generated documents. |
| **Source Status** | Real-time health dashboard showing which scraper APIs are online, their response latency, and whether optional sources like Adzuna are configured. |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Server components, API routes, and client components in one repo |
| Language | TypeScript | End-to-end type safety across API and UI |
| Styling | Tailwind CSS v3 | Utility-first, zero runtime CSS |
| Auth | NextAuth.js v4 | JWT-based sessions, credentials provider, per-user data isolation |
| ORM | Prisma v5 | Type-safe DB queries, migration tooling, dual-URL support for poolers |
| Database | PostgreSQL via Supabase | Persistent, serverless-friendly via PgBouncer connection pooler |
| AI | Grok API (xAI) | OpenAI-compatible REST API; powers resume analysis, cover letters, tailoring, and outreach. Falls back to keyword matching when key is absent. |
| Hosting | Vercel | Serverless edge deployment, automatic preview builds on every push |
| Charts | Pure SVG + Tailwind | Zero additional dependencies for analytics visualisations |

---

## How Authentication Works

The app uses **NextAuth.js v4** with a credentials provider (email + password). Every user gets their own isolated data — jobs, resumes, applications, configs, and pipeline runs are all scoped to the authenticated user.

**Signup:** `POST /api/auth/signup` — creates a new `User` record with a bcrypt-hashed password. No email verification is required.

**Login:** NextAuth's credentials provider validates the email/password, then issues a signed JWT session cookie. The JWT stores the user's database ID.

**Route protection:** `src/middleware.ts` intercepts all routes except `/login`, `/signup`, `/api/auth/*`, and static assets. Unauthenticated requests are redirected to `/login`.

**API protection:** Every API route calls `getRequiredUserId()` (from `src/lib/auth-helpers.ts`), which:
1. Reads the session from the JWT cookie
2. Extracts the user ID
3. Verifies the user still exists in the database (guards against stale sessions after a DB reset)
4. Returns the `userId` or a 401 response

**Sign out:** The sidebar has a Sign out button that calls `signOut({ callbackUrl: "/login" })`, which clears the session cookie and redirects to the login page.

---

## End-to-End User Guide

Follow these steps in order for the best experience.

---

### Step 0 — Create Your Account

**Go to:** `/signup`

Enter your email and a password (minimum 6 characters). Click **Create Account**. You will be redirected to the app automatically. Your account is private — all data you create is visible only to you.

> **Returning user?** Go to `/login` and sign in with your credentials.

---

### Step 1 — Fill In Your Profile

**Go to:** Sidebar → **My Profile** (`/profile`)

Your profile is used to personalise AI-generated cover letters, tailored resumes, and cold outreach emails.

| Field | What to enter |
|-------|--------------|
| **Full Name** | Your name as it appears on your resume |
| **Email** | Your contact email (shown in AI-generated documents) |
| **Phone** | Optional — included in tailored resumes |
| **LinkedIn** | Your LinkedIn profile URL |
| **GitHub** | Your GitHub profile URL |
| **Location** | City and country (e.g. "Bangalore, India") |

Click **Save Profile**.

---

### Step 2 — Configure Your Job Search Preferences

**Go to:** Sidebar → **Search Config** (`/settings`)

Before scraping any jobs, tell the app what you are looking for. Everything — scoring, filtering, and recommendations — is driven by this config.

| Field | What to enter | Example |
|-------|--------------|---------|
| **Job Titles** | Roles you are targeting. The scorer does word-level matching, so "React Developer" also matches "Senior React Engineer". | `Frontend Developer, React Engineer, UI Engineer` |
| **Location Type** | `remote`, `hybrid`, or `onsite`. | `remote` |
| **Preferred Locations** | City or country names. Ignored when Location Type is `remote`. | `Bangalore, Mumbai, London` |
| **Experience Level** | Your seniority. Exact-level matches score the highest. | `mid` |
| **Salary Min / Max** | Annual salary in USD. Leave blank for no preference. | `80000` / `140000` |
| **Required Keywords** | Skills a good job should mention. These directly boost match scores. | `React, TypeScript, GraphQL, Node.js` |
| **Excluded Keywords** | Terms that indicate a bad fit. Each one found subtracts 10 points from the score. | `PHP, Perl` |
| **Blacklisted Companies** | Companies you never want to see. Their jobs are forced to a score of 0. | `Bad Corp, Startup XYZ` |

Click **Save Config**.

---

### Step 3 — Upload Your Resume

**Go to:** Sidebar → **Resume Tailoring** (`/resumes`)

1. Click the upload zone or drag and drop a file.
2. Accepted formats: **PDF**, **DOCX**, **TXT**.
3. The server extracts the plain text immediately — this is what gets sent to the AI.
4. Give the resume a label (e.g. "Full Stack Resume v2").
5. Mark one resume as **Primary** using the star icon. The primary resume is pre-selected for all AI operations.

---

### Step 4 — Scrape Live Job Listings

**Go to:** Sidebar → **Opportunity Inbox** (`/`)

Click the **Scrape Now** button. The server fetches jobs from all configured sources in parallel (RemoteOK, Remotive, Arbeitnow, Jobicy, The Muse, and Adzuna if credentials are set). A banner shows how many jobs were added and updated. The inbox refreshes automatically.

**What happens during a scrape:**
- Each scraper fetches its public API and normalises results into a common `RawJob` format
- Every job is run through the 6-factor scoring engine against your active config
- Jobs are upserted — re-scraping the same job updates its score but never creates a duplicate

---

### Step 5 — Review the Opportunity Inbox

The inbox groups jobs into sections at the top:

| Section | Meaning |
|---------|---------|
| **⚡ Quick Wins** | Match score ≥ 78 AND low tailoring effort. Apply to these first. |
| **🎯 Best Bets** | Match score ≥ 65 with manageable effort. Your primary pipeline. |
| **All Jobs** | Every other scraped job, sorted by score descending. |

**Each job card shows:**
- Colour-coded score badge — **green** (70+), **amber** (40–69), **red** (< 40)
- Title, company, location, salary range, and posted date
- Tags (technologies mentioned in the listing)
- A **"WHY THIS MATCHED"** section that breaks down all six scoring factors

**Filter and search:**
- Search bar — filter by title or company
- Source dropdown — jobs from one scraper only
- Status tabs (New / Saved / All)

**Actions on each card:**

| Button | What it does |
|--------|-------------|
| **Save** | Marks the job as saved. |
| **Track** | Creates an Application record in the Kanban tracker. |
| **Dismiss** | Hides the job (reversible via the "All" filter). |

---

### Step 6 — Analyse Your Resume Against a Job

**Go to:** Sidebar → **Resume Tailoring** (`/resumes`)

1. Click on any resume card to open the detail page.
2. Click **Analyse Against Job**.
3. Search for and select a job in the picker modal.
4. Click **Run Analysis**.

Results appear within seconds:

| Result | Description |
|--------|-------------|
| **Match Score** | 0–100. How well your resume matches this specific role. |
| **Present Keywords** | Skills found in both your resume and the job description. |
| **Missing Keywords** | Skills the job asks for that are not in your resume — your tailoring checklist. |
| **Suggestions** | Specific, actionable rewrites recommended by the AI. |
| **Summary** | One-paragraph overall assessment. |

Re-running analysis on the same resume + job overwrites the previous result.

---

### Step 7 — Generate a Tailored Resume

**Go to:** Sidebar → **Resume Tailoring** (`/resumes`) → select a resume → click **Generate Tailored Resume**

The AI rewrites your resume specifically for a selected job, preserving your facts while optimising language, keywords, and structure. The output is a LaTeX source and a structured JSON representation of the resume. A projected match score estimates how well it will perform.

---

### Step 8 — Generate a Cover Letter

**Go to:** Sidebar → **Opportunity Inbox** or **Resume Tailoring**

On any job card or job detail, click **Generate Cover Letter**. The AI writes a personalised cover letter using your resume text, job description, and profile info. Choose the tone (Professional, Conversational, or Enthusiastic). The cover letter is saved and can be retrieved from the job at any time.

---

### Step 9 — Generate Cold Outreach Emails

**Go to:** Sidebar → **Cold Outreach** (`/outreach`)

1. Enter a company's website URL.
2. (Optional) Select a specific resume to reference.
3. Click **Generate Email**.

The AI researches the company from its public web presence, then writes a personalised outreach email you can send to a recruiter or hiring manager. All generated emails are saved to your history.

---

### Step 10 — Run the Full Automation Pipeline

**Go to:** Sidebar → **Pipeline** (`/pipeline`)

The Pipeline runs all steps automatically in sequence for you:

1. Scrape fresh jobs from all sources
2. Score them against your config
3. Analyse top candidates against your primary resume
4. Generate cover letters for successfully analysed jobs
5. Auto-track them as bookmarked applications

Configure threshold (minimum score to include), max jobs to process, and cover letter tone. Click **Run Pipeline** and watch the live progress log. Your pipeline run history is saved so you can review past runs.

---

### Step 11 — Move Jobs into Your Application Tracker

**Go to:** Sidebar → **Applications** (`/applications`)

The tracker is a Kanban board:

```
Bookmarked → Applied → Interview → Offer → Rejected
```

- Click **Track** on any inbox job card → it appears in **Bookmarked**
- Click a card to open the detail modal → use the **Status** dropdown to advance it
- Or drag the card directly to the target column

**When you move a job to "Applied":**
- A follow-up date is automatically set to +5 business days
- Urgency badges: 🔴 **Overdue**, 🟡 **Due soon**, 🔵 **Upcoming**

**Inside the application modal:**
- Free-text notes
- Recruiter contact info (name, email, LinkedIn)
- Manual follow-up date override
- Full event timeline with timestamps

---

### Step 12 — Monitor Your Pipeline in Analytics

**Go to:** Sidebar → **Analytics Dashboard** (`/analytics`)

| Chart | What it tells you |
|-------|-------------------|
| **Application Funnel** | Applications at each stage. Spot bottlenecks. |
| **Match Score Distribution** | Curve skewed left → config is too strict; loosen keywords. |
| **Weekly Trend** | Jobs scraped per week and average score over 8 weeks. |
| **Top Job Titles** | Validates your target titles are real positions being hired. |
| **Top Companies Hiring** | Companies appearing most in your results. |
| **Source Conversions** | Which scrapers produce the highest quality leads for you. |
| **Resume Performance** | Resumes ranked by average AI match score. |
| **Keyword Gaps** | Skills you're most frequently missing — your learning roadmap. |

---

### Step 13 — Check Source Health

**Go to:** Sidebar → **Source Status** (`/status`)

Pings all scraper APIs and shows:

| Status | Meaning |
|--------|---------|
| 🟢 **Online** | API responded. Latency bar shows response time in ms. |
| 🔴 **Error** | API returned an error or timed out. |
| ⚫ **Disabled** | Source requires unconfigured credentials (e.g. Adzuna). |

Click **Refresh** to re-run the health checks. One failing source never blocks others — the orchestrator uses `Promise.allSettled`.

---

### Recommended Daily Workflow

```
1. Open Source Status → confirm all sources are online
2. Open Opportunity Inbox → click Scrape Now
3. Review Quick Wins and Best Bets — save or track anything interesting
4. For tracked jobs → run Resume Analysis → review Missing Keywords
5. Generate a Cover Letter for roles you plan to apply to
6. Move applied jobs to Applied in the Tracker → log recruiter info
7. Check the Timeline on any Applied jobs with overdue follow-up dates
8. Weekly: check Analytics for funnel health and Keyword Gaps
```

---

### Frequently Asked Questions

**Q: The inbox is empty after scraping. What's wrong?**
Your Search Config might be too strict. Broaden your Required Keywords list, add more job titles, or temporarily remove Excluded Keywords.

**Q: All my jobs have low scores (< 40). Why?**
The most common cause is Required Keywords — if you've listed 15 keywords and most jobs only mention 2–3, keyword scoring will dominate. Reduce your list to the 4–5 most important skills.

**Q: AI analysis shows only keyword matching, not a proper AI analysis.**
`GROK_API_KEY` is not set. The app falls back to keyword matching automatically. Add your key from [console.x.ai](https://console.x.ai) to `.env` (locally) or Vercel environment variables (production) and restart.

**Q: I see "Disabled" for Adzuna on the Source Status page.**
Adzuna requires free API credentials. Register at [developer.adzuna.com](https://developer.adzuna.com), then add `ADZUNA_APP_ID` and `ADZUNA_API_KEY` to your environment variables.

**Q: Can I use the app without Supabase?**
The app works with any PostgreSQL provider — Railway, Neon, Render, or self-hosted. Just update `DATABASE_URL` and `DIRECT_URL` in `.env`. Supabase's free tier is easiest to set up (500 MB, no card needed).

**Q: I applied for a job outside the app. Can I still track it?**
Yes. Find the job in the Opportunity Inbox, click **Track**, then immediately open the modal and move it to **Applied**. Set the applied date manually if needed.

**Q: My session expired and I'm getting logged out unexpectedly.**
This is normal after the database is reset (`prisma db push --force-reset`). Sign out, sign up again to create a fresh account, and sign in.

---

## Architecture Overview

```
Browser
  │
  ├── /login, /signup           → Auth pages (public)
  ├── /                         → Opportunity Inbox
  ├── /applications             → Kanban Tracker
  ├── /analytics                → Analytics Dashboard
  ├── /resumes                  → Resume Tailoring
  ├── /outreach                 → Cold Outreach
  ├── /pipeline                 → Automation Pipeline
  ├── /profile                  → My Profile
  ├── /settings                 → Search Config
  └── /status                   → Source Status
        │
        ▼ (all non-public routes protected by src/middleware.ts)
  Next.js API Routes (src/app/api/**)
        │
        ├── src/lib/auth-helpers.ts        ← getRequiredUserId() — auth + DB existence check
        ├── src/lib/db.ts                  ← singleton Prisma client
        ├── src/lib/scoring.ts             ← 6-factor weighted scoring engine
        ├── src/lib/pipeline.ts            ← full automation pipeline orchestrator
        ├── src/lib/scrapers/              ← RemoteOK, Remotive, Arbeitnow, Jobicy, The Muse, Adzuna
        ├── src/lib/ai/tailor.ts           ← resume analysis (Grok API / keyword fallback)
        ├── src/lib/ai/cover-letter.ts     ← cover letter generation
        ├── src/lib/ai/outreach.ts         ← cold outreach email generation
        ├── src/lib/follow-up.ts           ← follow-up date + urgency logic
        └── src/lib/search-config.ts       ← getActiveSearchConfig() per user
              │
              ▼
        Supabase PostgreSQL
        (pooled at port 6543 via PgBouncer at runtime;
         direct at port 5432 for schema migrations)
```

**Request flow for a scrape:**
1. User clicks "Scrape Now" → `POST /api/jobs/scrape`
2. `getRequiredUserId()` validates the session and returns the user's DB ID
3. `getActiveSearchConfig(userId)` loads the user's preferences
4. All scrapers fetch their APIs in parallel via `Promise.allSettled`
5. `calculateMatchScore(job, config)` scores every job synchronously
6. Prisma upserts each job — the `@@unique([title, company, source, userId])` constraint prevents duplicates per user
7. Response returns counts of new and updated jobs

---

## Database Schema

All models live in `prisma/schema.prisma`. Every root model includes a `userId` field so each user's data is fully isolated.

### User

Stores authentication credentials.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `email` | String (unique) | Login email, lowercased |
| `passwordHash` | String | bcrypt hash of the password |
| `name` | String | Display name |

### Job

Stores every scraped listing, scoped to the user who scraped it.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `userId` | String | FK to User — isolates jobs per user |
| `title` | String | Job title as scraped |
| `company` | String | Company name |
| `location` | String? | City/country string, or "Remote" |
| `locationType` | String? | "remote", "hybrid", or "onsite" |
| `url` | String | Original listing URL |
| `source` | String | "remoteok", "remotive", "arbeitnow", etc. |
| `description` | String? | Full job description |
| `salaryMin` | Int? | Lower bound of salary range (annual) |
| `salaryMax` | Int? | Upper bound of salary range (annual) |
| `experienceLevel` | String? | "intern", "junior", "mid", "senior", "lead", "executive" |
| `matchScore` | Int | 0–100, computed by scoring engine at scrape time |
| `status` | String | "new" (default), "saved", "applied", "dismissed" |
| `tags` | String | JSON array of skill tags, stored as text |

**Unique constraint:** `[title, company, source, userId]` — prevents duplicate listings per user. Re-scraping an existing job updates it in place.

**Indexes:** `userId`, `status`, `matchScore`, `createdAt`.

### Resume

Stores uploaded resume files and extracted text.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | FK to User |
| `name` | String | User-given label |
| `fileName` | String | Original upload filename |
| `textContent` | String | Full extracted text — sent to the AI |
| `format` | String | "pdf", "docx", or "txt" |
| `isPrimary` | Boolean | Pre-selected for AI operations |
| `wordCount` | Int | Computed on upload |

### ResumeAnalysis

One row per (resume, job) pair — AI analysis output.

| Field | Type | Notes |
|-------|------|-------|
| `resumeId` | String | FK to Resume |
| `jobId` | String | FK to Job |
| `matchScore` | Int | 0–100 match score |
| `presentKeywords` | String | JSON array of matching skills |
| `missingKeywords` | String | JSON array of skills in job but not resume |
| `suggestions` | String | JSON array of specific rewrite suggestions |
| `summary` | String | One-paragraph AI assessment |

**Unique constraint:** `[resumeId, jobId]` — re-running analysis overwrites the previous result.

### TailoredResume

AI-generated tailored resume for a specific (resume, job) pair.

| Field | Type | Notes |
|-------|------|-------|
| `resumeId` | String | FK to Resume |
| `jobId` | String | FK to Job |
| `latexSource` | String | Complete LaTeX source code |
| `resumeJson` | String | Structured JSON representation of the resume |
| `projectedScore` | Int | Estimated match score after tailoring |

### CoverLetter

AI-generated cover letter for a specific (resume, job) pair.

| Field | Type | Notes |
|-------|------|-------|
| `resumeId` | String | FK to Resume |
| `jobId` | String | FK to Job |
| `content` | String | Full cover letter text |
| `tone` | String | "professional", "conversational", or "enthusiastic" |

### Application

Tracks a job through the hiring pipeline.

| Field | Type | Notes |
|-------|------|-------|
| `jobId` | String (unique) | One application per job |
| `status` | String | "bookmarked", "applied", "interview", "offer", "rejected" |
| `notes` | String | Free-text notes |
| `recruiterName` | String | Recruiter contact name |
| `recruiterEmail` | String | Recruiter email |
| `recruiterLinkedIn` | String | Recruiter LinkedIn URL |
| `followUpDate` | DateTime? | Auto-set to +5 business days when applied |
| `appliedAt` | DateTime? | When you applied |
| `timeline` | String | JSON array of `{ event, timestamp, note }` — full audit trail |

### SearchConfig

User's job search preferences.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | FK to User |
| `titles` | String | JSON array of target job titles |
| `locations` | String | JSON array of preferred locations |
| `locationType` | String? | "remote", "hybrid", or "onsite" |
| `experienceLevel` | String? | Target seniority level |
| `salaryMin` | Int? | Minimum annual salary |
| `salaryMax` | Int? | Maximum annual salary |
| `includeKeywords` | String | JSON array — jobs with these score higher |
| `excludeKeywords` | String | JSON array — jobs with these score lower |
| `blacklistedCompanies` | String | JSON array — these companies score 0 |

### PipelineRun

Record of each automation pipeline execution.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | FK to User |
| `status` | String | "running", "completed", "failed" |
| `scrapeCount` | Int | Jobs scraped |
| `newJobsCount` | Int | New jobs added |
| `analyzedCount` | Int | Jobs analysed against resume |
| `coverLetterCount` | Int | Cover letters generated |
| `autoTrackedCount` | Int | Applications auto-created |
| `errors` | String | JSON array of error messages |

### OutreachEmail

AI-generated cold outreach emails.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String | FK to User |
| `companyUrl` | String | The URL the user provided |
| `companyName` | String | Company name discovered by AI |
| `companyInfo` | String | JSON object of researched company info |
| `emailSubject` | String | Generated email subject |
| `emailBody` | String | Generated email body |
| `resumeId` | String? | Resume used for personalisation |

### UserProfile

Optional personal details for AI personalisation.

| Field | Type | Notes |
|-------|------|-------|
| `userId` | String (PK) | One profile per user |
| `name` | String | Full name |
| `email` | String | Contact email |
| `phone` | String | Phone number |
| `linkedin` | String | LinkedIn URL |
| `github` | String | GitHub URL |
| `location` | String | City and country |

---

## Scoring Engine

**File:** `src/lib/scoring.ts`

Every job is scored 0–100 at scrape time by summing six weighted factors:

| Factor | Max Points | How it scores |
|--------|-----------|---------------|
| **Title Match** | 30 | Exact title match = 30 pts. Substring match = 20 pts. One-word overlap = 10 pts. No match = 0 pts. |
| **Location Match** | 20 | Remote + user wants remote = 20 pts. Exact city = 20 pts. Same country = 10 pts. No match = 0 pts. |
| **Salary Fit** | 15 | Job salary fully within your range = 15 pts. Ranges overlap = 10 pts. No salary listed = 8 pts. Outside range = 0 pts. |
| **Keyword Fit** | 20 | Proportional to fraction of `includeKeywords` found in the job. Each `excludeKeyword` found subtracts 10 pts. |
| **Experience Fit** | 10 | Exact level = 10 pts. One level away = 5 pts. Two+ levels away = 0 pts. |
| **Company Preference** | 5 | Not blacklisted = 5 pts. Blacklisted = −100 pts (forces score to 0). |

**Score clamping:** Always `Math.max(0, Math.min(100, rawTotal))`.

**No config penalty:** If you haven't set a preference for a factor, that factor grants its full points automatically.

### Priority Labels

On top of the match score, each job gets a recommendation label:

| Label | Condition |
|-------|-----------|
| `quick-win` | matchScore ≥ 78 AND effortScore ≤ 40 |
| `best-bet` | matchScore ≥ 65 AND priorityScore ≥ 60 |
| `stretch` | matchScore ≥ 50 |
| `low-priority` | everything else |

**Priority Score** = `matchScore − (effortScore × 0.35) + freshnessBonus` (up to 15 points for jobs posted within 15 days).

---

## AI Features

All AI features use the **Grok API** (`grok-3` model, xAI). The API is OpenAI-compatible, so no SDK is needed — requests are plain `fetch` calls. Every feature has a graceful fallback when `GROK_API_KEY` is not set.

### Resume Analysis (`src/lib/ai/tailor.ts`)

Sends the full resume text and job description to Grok. Parses a structured JSON response with `matchScore`, `presentKeywords`, `missingKeywords`, and `suggestions`. Falls back to local keyword-matching if the API is unavailable.

### Cover Letter Generation (`src/lib/ai/cover-letter.ts`)

Sends the resume, job description, company name, job title, and selected tone. Returns a complete cover letter ready to send. Tone options: Professional, Conversational, Enthusiastic.

### Tailored Resume Generation (`src/lib/ai/generate.ts`)

Sends the resume and job description. Returns a full rewrite in both LaTeX (ready for Overleaf or pdflatex) and structured JSON. Computes a projected match score to estimate improvement.

### Cold Outreach (`src/lib/ai/outreach.ts`)

Given a company URL, fetches the company's public web presence, extracts relevant information, then writes a personalised cold outreach email referencing the company's work and the candidate's background.

---

## API Reference

All routes are under `/api`. Every route returns JSON. All routes except `/api/auth/*` and `/api/auth/signup` require a valid session.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create a new account. Body: `{ email, password, name? }` |
| `POST` | `/api/auth/[...nextauth]` | NextAuth.js handler (login, session, signout) |

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/jobs` | List jobs for the current user. Query params: `status`, `source`, `minScore`, `q`, `sort` |
| `GET` | `/api/jobs/[id]` | Single job with score breakdown and priority insights |
| `PATCH` | `/api/jobs/[id]` | Update job `status` |
| `POST` | `/api/jobs/scrape` | Trigger a live scrape. Returns `{ added, updated, total }` |
| `GET` | `/api/jobs/[id]/cover-letter` | Get saved cover letter for this job |
| `POST` | `/api/jobs/[id]/cover-letter` | Generate a cover letter. Body: `{ tone? }` |

### Applications

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/applications` | List all applications with job details |
| `POST` | `/api/applications` | Create application. Body: `{ jobId, status }`. Auto-sets follow-up date if applied. |
| `GET` | `/api/applications/[id]` | Single application with job, timeline |
| `PATCH` | `/api/applications/[id]` | Update status, notes, recruiter info, follow-up date |
| `DELETE` | `/api/applications/[id]` | Remove the application (job record is kept) |
| `POST` | `/api/applications/[id]/timeline` | Append a custom timeline event. Body: `{ event, note }` |

### Resumes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/resumes` | List all resumes |
| `POST` | `/api/resumes` | Upload a resume (multipart/form-data, field: `file`). Accepts PDF, DOCX, TXT. |
| `GET` | `/api/resumes/[id]` | Single resume with all its analyses |
| `PATCH` | `/api/resumes/[id]` | Update name or isPrimary |
| `DELETE` | `/api/resumes/[id]` | Delete resume and all associated data |
| `POST` | `/api/resumes/[id]/analyze` | Run AI analysis. Body: `{ jobId }` |
| `POST` | `/api/resumes/[id]/generate` | Generate a tailored resume. Body: `{ jobId }` |

### Tailored Resumes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tailored-resumes/[id]` | Get a tailored resume by ID |

### Pipeline

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pipeline/run` | Run the full automation pipeline. Body: `{ threshold?, maxJobs?, tone? }` |
| `GET` | `/api/pipeline/history` | List past pipeline runs |
| `GET` | `/api/pipeline/ready` | Check readiness (jobs above threshold, resume present) |

### Outreach

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/outreach` | List saved outreach emails |
| `POST` | `/api/outreach` | Generate a new outreach email. Body: `{ companyUrl, resumeId? }` |
| `DELETE` | `/api/outreach/[id]` | Delete a saved outreach email |

### Config, Profile, and Analytics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Get the active search config |
| `PUT` | `/api/config` | Save or update search config |
| `GET` | `/api/profile` | Get the user's profile |
| `PUT` | `/api/profile` | Save or update the profile |
| `GET` | `/api/analytics` | Compute and return the full analytics payload |
| `GET` | `/api/scrapers/status` | Health-check all scraper APIs |

### Cron

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cron/daily` | Runs the pipeline for every registered user. Intended to be called by a cron job or Vercel Cron. |

---

## Project Structure

```
CustomJobFinder/
├── prisma/
│   └── schema.prisma              # All database models, relations, and indexes
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout — wraps every page with Providers and Sidebar
│   │   ├── page.tsx               # / — Opportunity Inbox
│   │   ├── login/page.tsx         # Login page (public)
│   │   ├── signup/page.tsx        # Signup page (public)
│   │   ├── analytics/page.tsx     # Analytics Dashboard
│   │   ├── applications/page.tsx  # Kanban Application Tracker
│   │   ├── outreach/page.tsx      # Cold Outreach
│   │   ├── pipeline/page.tsx      # Automation Pipeline
│   │   ├── profile/page.tsx       # My Profile
│   │   ├── resumes/
│   │   │   ├── page.tsx           # Resume list and uploader
│   │   │   └── [id]/page.tsx      # Single resume with analysis results
│   │   ├── settings/page.tsx      # Search Config form
│   │   ├── status/page.tsx        # Source Status
│   │   └── api/                   # All Next.js API route handlers
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │       │   └── signup/route.ts         # Account creation
│   │       ├── analytics/route.ts
│   │       ├── applications/route.ts
│   │       ├── applications/[id]/route.ts
│   │       ├── applications/[id]/timeline/route.ts
│   │       ├── config/route.ts
│   │       ├── cron/daily/route.ts
│   │       ├── jobs/route.ts
│   │       ├── jobs/[id]/route.ts
│   │       ├── jobs/[id]/cover-letter/route.ts
│   │       ├── jobs/scrape/route.ts
│   │       ├── outreach/route.ts
│   │       ├── outreach/[id]/route.ts
│   │       ├── pipeline/run/route.ts
│   │       ├── pipeline/history/route.ts
│   │       ├── pipeline/ready/route.ts
│   │       ├── profile/route.ts
│   │       ├── resumes/route.ts
│   │       ├── resumes/[id]/route.ts
│   │       ├── resumes/[id]/analyze/route.ts
│   │       ├── resumes/[id]/generate/route.ts
│   │       ├── scrapers/status/route.ts
│   │       └── tailored-resumes/[id]/route.ts
│   │
│   ├── components/
│   │   ├── Providers.tsx           # NextAuth SessionProvider wrapper
│   │   ├── Sidebar.tsx             # Navigation sidebar with Sign out button
│   │   ├── JobCard.tsx             # Job card — score badge, breakdown, action buttons
│   │   ├── JobDetail.tsx           # Expanded job detail side-panel
│   │   ├── FilterBar.tsx           # Search and filter controls for the inbox
│   │   ├── ScoreBadge.tsx          # Colour-coded 0–100 score pill component
│   │   ├── KanbanBoard.tsx         # Full Kanban board layout
│   │   ├── KanbanColumn.tsx        # Single Kanban column
│   │   ├── ApplicationCard.tsx     # Compact card within a Kanban column
│   │   ├── ApplicationModal.tsx    # Full application editor modal
│   │   ├── TimelineEntry.tsx       # Single timeline event row
│   │   ├── AnalyticsDashboard.tsx  # All analytics chart components (SVG-based)
│   │   ├── AnalysisPanel.tsx       # Resume analysis result display
│   │   ├── ResumeCard.tsx          # Resume list item card
│   │   ├── ResumeUploader.tsx      # Drag-and-drop file upload zone
│   │   ├── JobPickerModal.tsx      # Job selector modal for resume analysis
│   │   ├── ApprovalGateModal.tsx   # Generic confirmation dialog
│   │   └── TagInput.tsx            # Tag input for comma-separated config arrays
│   │
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth configuration (authOptions)
│   │   ├── auth-helpers.ts         # getRequiredUserId() — central auth + DB check
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── scoring.ts              # 6-factor weighted scoring + priority insights engine
│   │   ├── pipeline.ts             # Full automation pipeline orchestrator
│   │   ├── search-config.ts        # getActiveSearchConfig(userId) — per-user config
│   │   ├── follow-up.ts            # Business-day arithmetic + urgency classification
│   │   ├── dedup.ts                # Deduplication helpers used during scraping
│   │   ├── json-arrays.ts          # toJsonArray / fromJsonArray helpers
│   │   ├── serialize-application.ts  # Shared serialisation helpers
│   │   ├── ai/
│   │   │   ├── tailor.ts           # Resume analysis (Grok API + keyword fallback)
│   │   │   ├── cover-letter.ts     # Cover letter generation
│   │   │   ├── generate.ts         # Tailored resume generation
│   │   │   └── outreach.ts         # Cold outreach email generation
│   │   ├── parsers/
│   │   │   ├── pdf.ts              # PDF → plain text via pdf-parse
│   │   │   ├── docx.ts             # DOCX → plain text via mammoth
│   │   │   └── txt.ts              # TXT passthrough
│   │   └── scrapers/
│   │       ├── index.ts            # Orchestrates all scrapers in parallel
│   │       ├── remoteok.ts         # RemoteOK public JSON API
│   │       ├── remotive.ts         # Remotive public JSON API
│   │       ├── arbeitnow.ts        # Arbeitnow public JSON API
│   │       ├── jobicy.ts           # Jobicy public JSON API
│   │       ├── themuse.ts          # The Muse public JSON API
│   │       ├── adzuna.ts           # Adzuna API (requires credentials)
│   │       └── types.ts            # RawJob interface shared across scrapers
│   │
│   ├── middleware.ts               # NextAuth route protection — redirects to /login
│   └── types/
│       └── index.ts                # All shared TypeScript types and interfaces
│
├── .env                            # Local environment variables (gitignored)
├── package.json
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js 18 or later (`nvm use 22` recommended)
- A PostgreSQL database — [Supabase](https://supabase.com) free tier is the easiest option

### Step 1 — Clone and install

```bash
git clone https://github.com/lohith261/CustomJobFinder.git
cd CustomJobFinder
npm install
```

`npm install` automatically runs `prisma generate` via the `postinstall` hook, generating the TypeScript Prisma client from `schema.prisma`. No database connection is made at this step.

### Step 2 — Create your `.env` file

Create `.env` at the project root (it is gitignored and will never be committed):

```env
# Supabase Postgres — pooled connection for runtime use
# Port 6543 via PgBouncer. pgbouncer=true disables prepared statements.
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Postgres — direct connection for Prisma migrations
# Port 5432, bypasses PgBouncer. Required for prisma db push.
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# NextAuth — required for session management
# Generate NEXTAUTH_SECRET with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Grok (xAI) API key — powers AI features
# Get yours free at https://console.x.ai
# If missing, the app silently falls back to keyword-matching.
GROK_API_KEY="your-grok-api-key"

# Adzuna API credentials (optional)
# Register free at https://developer.adzuna.com
# Scraper is automatically disabled when these are not set.
ADZUNA_APP_ID="your-app-id"
ADZUNA_API_KEY="your-api-key"
```

**Where to find your Supabase connection strings:**
1. Open your Supabase project dashboard
2. Click the **Connect** button in the top navbar
3. Under "Connection string" → "URI":
   - Copy the **Transaction pooler** string (port 6543) → `DATABASE_URL`
   - Copy the **Direct connection** string (port 5432) → `DIRECT_URL`
4. Replace `[YOUR-PASSWORD]` with your database password

**URL-encode special characters in passwords:**

| Character | Encoded |
|-----------|---------|
| `&` | `%26` |
| `@` | `%40` |
| `#` | `%23` |
| `?` | `%3F` |
| ` ` (space) | `%20` |

Example: password `my&pass@word` → `my%26pass%40word`.

### Step 3 — Push the schema to your database

```bash
npm run db:push
```

Reads `schema.prisma` and creates all tables, indexes, and constraints. Uses `DIRECT_URL` (port 5432) because DDL statements require a direct connection. Run this once on setup and again after any `schema.prisma` change.

### Step 4 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`. Click "Create one" to sign up.

---

## Deploying to Vercel

### Step 1 — Connect the repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Vercel detects Next.js automatically — no build settings need to change

### Step 2 — Add environment variables

Go to your Vercel project → **Settings → Environment Variables** and add:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | Supabase Transaction pooler URL (port 6543, with `?pgbouncer=true`) | Runtime queries |
| `DIRECT_URL` | Supabase direct connection URL (port 5432) | Prisma CLI migrations only |
| `NEXTAUTH_SECRET` | A random 32-byte base64 string (`openssl rand -base64 32`) | **Required** — signs session JWTs |
| `NEXTAUTH_URL` | Your Vercel deployment URL, e.g. `https://your-app.vercel.app` | **Required** — used for redirect URLs |
| `GROK_API_KEY` | Your xAI Grok API key | Optional — enables AI features |
| `ADZUNA_APP_ID` | Adzuna Application ID | Optional — enables Adzuna scraper |
| `ADZUNA_API_KEY` | Adzuna API Key | Optional — required alongside APP_ID |

Set all variables for Production, Preview, and Development environments.

### Step 3 — Deploy

Push a commit or go to **Deployments → Redeploy** (uncheck "Use existing build cache" for a clean build).

**What happens during the Vercel build:**
1. `npm install` → `postinstall` runs `prisma generate` (no DB connection)
2. `npm run build` → `next build` compiles the app
3. No database connection during the build. Schema was already applied by `db push` from your local machine.

### Why `prisma db push` was removed from the build script

An earlier version included `prisma db push` in `npm run build`. This caused failures because:
1. Vercel's build servers cannot reach Supabase's direct Postgres port (5432)
2. PgBouncer's Transaction mode does not support the DDL commands `prisma db push` uses
3. Running schema migrations on every deploy risks concurrent migration conflicts

**The correct workflow:** Run `npm run db:push` locally whenever `schema.prisma` changes. Vercel builds only run `prisma generate`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL pooled connection string (PgBouncer, port 6543). Must include `?pgbouncer=true`. Used by the app at runtime. |
| `DIRECT_URL` | Yes | PostgreSQL direct connection string (port 5432). Used by `prisma db push` for schema migrations. Not used by the running app. |
| `NEXTAUTH_SECRET` | Yes | Random secret used to sign and verify JWT session cookies. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | The canonical URL of your deployment (e.g. `http://localhost:3000` locally, `https://your-app.vercel.app` in production). |
| `GROK_API_KEY` | No | xAI Grok API key. Enables AI-powered resume analysis, cover letter generation, tailored resumes, and cold outreach. Without it, AI features fall back to keyword matching. |
| `ADZUNA_APP_ID` | No | Adzuna Application ID. Register free at [developer.adzuna.com](https://developer.adzuna.com). Without it, the Adzuna scraper is silently disabled. |
| `ADZUNA_API_KEY` | No | Adzuna API Key. Required alongside `ADZUNA_APP_ID`. Both must be present for the scraper to activate. |

---

## How Each Feature Works

### Opportunity Inbox (`/`)

Loads `GET /api/jobs` and groups results into Quick Wins, Best Bets, and a flat list. Each `JobCard` shows the score badge, metadata, a "WHY THIS MATCHED" breakdown of all six scoring factors, and action buttons. Clicking **Scrape Now** sends `POST /api/jobs/scrape` — all scrapers run in parallel via `Promise.allSettled` so one failing API never blocks the rest.

### Application Tracker (`/applications`)

Kanban board with five columns. Moving a card (via drag or the status dropdown) sends `PATCH /api/applications/[id]`. When status becomes "applied", the server computes a +5 business day follow-up date using `src/lib/follow-up.ts`. Every status change, recruiter info update, and note is automatically appended to the `timeline` JSON array, creating a full audit trail.

### Resume Tailoring (`/resumes`)

On upload, the server routes the file to `pdf-parse` (PDF), `mammoth` (DOCX), or a plain passthrough (TXT), extracts the text, and stores it in `Resume.textContent`. AI analysis sends both the resume text and job description to Grok and saves the structured result to `ResumeAnalysis`. The tailored resume generator rewrites the resume in LaTeX and JSON format, optimised for the specific job.

### Cover Letters

Generated via `POST /api/jobs/[id]/cover-letter`. Sends the resume text, job description, company name, and tone to Grok. Result is saved to `CoverLetter` and returned immediately. Tone options: `professional`, `conversational`, `enthusiastic`.

### Cold Outreach (`/outreach`)

`POST /api/outreach` sends the company URL to `src/lib/ai/outreach.ts`. The AI fetches and researches the company's public web presence, extracts key facts, and writes a personalised outreach email from the candidate's background. All emails are saved for reference.

### Automation Pipeline (`/pipeline`)

`POST /api/pipeline/run` calls `runPipeline()` in `src/lib/pipeline.ts`, which executes steps A–G sequentially:
- **A** — Scrape all sources and upsert jobs
- **B** — Select candidates above the threshold score
- **C** — Fetch the primary resume
- **D** — Analyse each candidate against the resume
- **E** — Generate cover letters for successfully analysed jobs
- **F** — Auto-create `bookmarked` applications for all cover-lettered jobs
- **G** — Mark the pipeline run as completed

Each step is wrapped in try/catch and errors are logged to `PipelineRun.errors` — a partial failure never aborts the whole run.

### Analytics Dashboard (`/analytics`)

`GET /api/analytics` runs 15 database queries in parallel via `Promise.all`. Key computations: application funnel via `groupBy(status)`, score distribution bucketed in JavaScript, weekly trend via raw SQL with `DATE_TRUNC('week', createdAt)`, keyword gaps by flattening and counting all `missingKeywords` arrays across every `ResumeAnalysis`. Charts are pure SVG — no charting library.

### Search Config (`/settings`)

Reads and writes `SearchConfig`. Changes take effect immediately on the next scrape or page load — the scoring engine always reads the current active config at query time. All array fields are stored as JSON strings and parsed by helpers in `src/lib/json-arrays.ts`.

### Source Status (`/status`)

`GET /api/scrapers/status` pings all scraper APIs concurrently with a 6-second timeout and returns `{ status, latency, error }` per source. Adzuna shows "Disabled" instead of attempting a network call when its credentials are absent.

### Daily Cron (`/api/cron/daily`)

Fetches all users from the database and runs the full pipeline for each one sequentially. Intended to be called by a scheduled job (e.g. Vercel Cron) once per day to keep all users' inboxes fresh automatically.
