# Job Hunter

An AI-powered job search assistant that scrapes live listings, scores them against your preferences, generates tailored resumes and cover letters, and tracks every application.

**Live:** https://custom-job-finder.vercel.app

---

## Features

- **Opportunity Inbox** — scrapes RemoteOK, Remotive, Arbeitnow, Jobicy, The Muse, and Adzuna; scores every job against your config with a breakdown tooltip
- **Application Tracker** — drag-and-drop Kanban (Bookmarked → Applied → Interview → Offer → Rejected) with recruiter notes, follow-up reminders, and event timeline
- **Resume Tailoring** — upload PDF/DOCX/TXT; AI analysis shows match score, missing keywords, and rewrite suggestions; generates a fully tailored LaTeX resume
- **Cover Letters** — AI-generated per job, with selectable tone (Professional / Conversational / Enthusiastic), saved to your application
- **Cold Outreach** — enter any company URL; AI researches it and writes a personalised email; one-click Gmail draft; reply tracking
- **Automation Pipeline** — one click runs scrape → score → analyse → cover letter → auto-track
- **Analytics** — funnel chart, match score distribution, weekly trend, top companies, source conversions, keyword gaps; filter by 7d / 30d / 90d / All
- **Multiple Search Profiles** — switch configs from the sidebar dropdown
- **Dark Mode** — toggle in sidebar

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v4 (credentials + JWT) |
| ORM | Prisma v5 |
| Database | PostgreSQL (Supabase recommended) |
| AI | Grok API (xAI) — OpenAI-compatible |
| Hosting | Vercel |

---

## Local Setup

```bash
git clone https://github.com/lohith261/CustomJobFinder.git
cd CustomJobFinder
npm install
cp .env.example .env          # fill in values (see below)
npx prisma db push
npm run dev                   # http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string (pooled — use Supabase PgBouncer URL) |
| `DIRECT_URL` | ✅ | Direct Postgres URL (for Prisma migrations) |
| `NEXTAUTH_SECRET` | ✅ | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Full app URL (e.g. `https://your-app.vercel.app`) |
| `GROK_API_KEY` | ✅ | From [console.x.ai](https://console.x.ai) — powers all AI features |
| `CRON_SECRET` | ✅ | Secures the daily cron endpoint — `openssl rand -base64 32` |
| `ADZUNA_APP_ID` | optional | From [developer.adzuna.com](https://developer.adzuna.com) |
| `ADZUNA_API_KEY` | optional | From [developer.adzuna.com](https://developer.adzuna.com) |

---

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables above in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

The daily scrape + pipeline run fires automatically via `vercel.json` cron at `0 8 * * *` (08:00 UTC).

---

## FAQ

**Inbox is empty after scraping?** Your Search Config is too strict — broaden Required Keywords or add more job titles.

**All scores are low (< 40)?** Reduce Required Keywords to your top 4–5 skills; too many keywords dilutes the score.

**AI shows keyword matching only?** `GROK_API_KEY` is missing — add it and redeploy.

**Adzuna shows "Disabled"?** Register at developer.adzuna.com and add the two Adzuna env vars.
