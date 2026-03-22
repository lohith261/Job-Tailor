# Job Tailor

An AI-powered job search platform built for Indian job seekers. Scrapes live listings from Naukri, Indeed India, Internshala and more — scores them, tailors your resume and cover letter, and tracks every application.

**Live:** https://jobtailor.in

---

## Features

- **Opportunity Inbox** — live jobs from Naukri, Indeed India, Internshala, Adzuna and remote boards; AI match score with breakdown; sort, filter, pin, and bulk actions
- **Application Tracker** — drag-and-drop Kanban with collapsible columns, bulk move/archive, recruiter notes and event timeline
- **Resume Tailoring** — upload PDF or paste text; AI analysis shows match score, missing keywords and rewrite suggestions; side-by-side comparison mode
- **Cover Letters** — AI-generated per job with tone selector (Professional / Friendly / Confident / Concise); saved to application
- **Cold Outreach** — enter any company URL; AI writes a personalised email; reply tracking
- **Automation Pipeline** — one click runs scrape → score → analyse → cover letter → auto-track; cancel mid-run
- **Analytics** — funnel, score distribution, weekly trend, source breakdown with drill-down; CSV export
- **Pro Plan** — ₹499/month or ₹3,999/year; UPI payment with admin activation
- **Dark Mode**, multiple search profiles, email verification, onboarding emails

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v4 |
| ORM | Prisma v5 + PostgreSQL (Supabase) |
| AI | Grok API (xAI) |
| Email | Resend |
| Scraping | scrape.do proxy + direct APIs |
| Monitoring | Sentry |
| Hosting | Vercel |

---

## Local Setup

```bash
git clone https://github.com/lohith261/job-tailor.git
cd job-tailor
npm install
cp .env.example .env        # fill in values below
npx prisma db push
npm run dev                 # http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string (pooled) |
| `DIRECT_URL` | ✅ | Direct Postgres URL (for migrations) |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Full app URL e.g. `https://jobtailor.in` |
| `GROK_API_KEY` | ✅ | From [console.x.ai](https://console.x.ai) |
| `CRON_SECRET` | ✅ | `openssl rand -base64 32` |
| `RESEND_API_KEY` | ✅ | From [resend.com](https://resend.com) |
| `SCRAPE_DO_TOKEN` | optional | From [scrape.do](https://scrape.do) — enables Naukri, Indeed, Internshala |
| `ADZUNA_APP_ID` | optional | From [developer.adzuna.com](https://developer.adzuna.com) |
| `ADZUNA_API_KEY` | optional | From [developer.adzuna.com](https://developer.adzuna.com) |
| `TELEGRAM_BOT_TOKEN` | optional | For admin payment notifications |
| `TELEGRAM_CHAT_ID` | optional | Your Telegram chat ID |
| `ADMIN_EMAIL` | optional | Email address with admin panel access |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | From [sentry.io](https://sentry.io) |

---

## Scraper Sources

| Source | Region | Method |
|---|---|---|
| Naukri.com | 🇮🇳 India | scrape.do |
| Indeed India | 🇮🇳 India | scrape.do |
| Internshala | 🇮🇳 India (freshers) | scrape.do |
| Adzuna | Global | Official API |
| RemoteOK / Remotive / Jobicy | Remote | Direct |

---

## Deploy to Vercel

1. Push to GitHub → import at [vercel.com/new](https://vercel.com/new)
2. Add environment variables in the Vercel dashboard
3. Deploy — Vercel auto-detects Next.js

Daily pipeline runs automatically via cron at `0 8 * * *` (08:00 UTC).

---

## FAQ

**Inbox empty after scraping?** Broaden your Search Config — fewer required keywords, more job titles.

**All scores low (< 40)?** Reduce required keywords to your top 4–5 skills.

**Naukri / Indeed not showing results?** Add `SCRAPE_DO_TOKEN` to your environment variables.

**AI features not working?** Check that `GROK_API_KEY` is set and redeployed.
