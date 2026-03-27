"use client";

import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  {
    number: "01",
    title: "Smart Job Matching",
    description:
      "Scrapes LinkedIn, Indeed, Naukri, RemoteOK and more daily. Every listing gets an AI match score based on your target role, salary, location and skills.",
  },
  {
    number: "02",
    title: "AI Resume Analysis",
    description:
      "Upload your resume once. Get keyword match scores, missing skills, and specific rewrite suggestions tailored to each job you're targeting.",
  },
  {
    number: "03",
    title: "Cover Letters in Seconds",
    description:
      "One click generates a personalised cover letter in your tone — Professional, Conversational, or Enthusiastic. Editable and saved per job.",
  },
  {
    number: "04",
    title: "Application Tracker",
    description:
      "Drag-and-drop Kanban board tracks every application from Bookmarked to Offer. Follow-up reminders so nothing falls through the cracks.",
  },
  {
    number: "05",
    title: "Full Automation Pipeline",
    description:
      "One click: scrape → score → analyse → generate cover letters → auto-track. Your entire job search workflow in under 60 seconds.",
  },
  {
    number: "06",
    title: "Analytics That Guide You",
    description:
      "See your application funnel, which sources convert best, which keywords you're missing, and how match scores trend week over week.",
  },
];

const STATS = [
  { value: "6", label: "Job boards scraped daily" },
  { value: "60s", label: "Full pipeline runtime" },
  { value: "₹499", label: "Pro plan per month" },
  { value: "100%", label: "Privacy — your data, your profile" },
];

const TESTIMONIALS = [
  {
    quote:
      "I used to spend 3 hours a day scanning job boards. Job Tailor cut that to 15 minutes. The match scores are eerily accurate.",
    name: "Priya S.",
    role: "Senior Product Manager, Bangalore",
  },
  {
    quote:
      "The cover letter generator nailed my tone on the first try. Got a callback from Flipkart within 48 hours of applying.",
    name: "Rahul M.",
    role: "Software Engineer, Hyderabad",
  },
  {
    quote:
      "Finally a job search tool built for Indian job seekers — it actually knows Naukri and LinkedIn India. Game changer.",
    name: "Ananya K.",
    role: "Data Analyst, Pune",
  },
];

const FREE_FEATURES = [
  "Opportunity Inbox (unlimited scraping)",
  "Application Tracker (Kanban board)",
  "Analytics dashboard (basic)",
  "1 resume upload",
  "3 AI resume analyses / month",
  "3 AI cover letters / month",
  "2 cold outreach emails / month",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited AI resume analyses",
  "Unlimited cover letter generation",
  "Unlimited cold outreach emails",
  "Tailored resume generation (LaTeX + PDF)",
  "Full automation pipeline",
  "Multiple search profiles",
  "Full analytics with trends",
  "Priority support",
];

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">Job Tailor</span>
          </Link>

          <nav className="hidden items-center gap-7 sm:flex">
            <a href="#features" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
              Pricing
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link href="/login" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Get started free
            </Link>
          </div>

          <button
            className="flex items-center justify-center rounded-md p-2 text-gray-600 sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-4">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700">How it works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700">Pricing</a>
              <Link href="/login" className="text-sm font-medium text-gray-700">Sign in</Link>
              <Link href="/signup" className="rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-semibold text-white">
                Get started free
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gray-950 pb-24 pt-20 sm:pb-32 sm:pt-28">
        {/* Background gradients */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-brand-900/30 blur-3xl" />
          <div className="absolute -right-40 top-1/2 h-[400px] w-[400px] rounded-full bg-brand-800/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Built for Indian job seekers · Early access
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            The job search{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
              your career deserves.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
            Job Tailor scrapes 6 job boards daily, scores every listing against
            your profile with AI, and generates tailored cover letters — so you
            spend time applying, not searching.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full max-w-xs rounded-xl bg-brand-500 px-7 py-4 text-base font-bold text-white shadow-lg shadow-brand-900/50 transition-all hover:bg-brand-400 sm:w-auto"
            >
              Start free — no card needed
            </Link>
            <a
              href="#how-it-works"
              className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-gray-200 transition-all hover:bg-white/10 sm:w-auto"
            >
              See how it works →
            </a>
          </div>

          {/* Job board logos strip */}
          <div className="mt-16 border-t border-white/10 pt-10">
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Scraped daily from
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-semibold text-gray-500">
              {["LinkedIn", "Indeed", "Naukri", "RemoteOK", "Remotive", "Adzuna"].map((board) => (
                <span key={board} className="transition-colors hover:text-gray-300">
                  {board}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">How it works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              You dream it.{" "}
              <span className="text-brand-600">We ship your applications.</span>
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              From setup to offer in four simple steps — built for people who want results, not busywork.
            </p>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Configure", desc: "Set your target titles, salary, location, and skills. Takes 5 minutes." },
              { step: "02", title: "Discover", desc: "We pull fresh jobs from 6 boards every day and AI-score them against your profile." },
              { step: "03", title: "Apply", desc: "Get tailored resumes and cover letters for your top matches. Apply in minutes." },
              { step: "04", title: "Track", desc: "Follow every application from first contact to offer on your Kanban board." },
            ].map((item, i) => (
              <div key={item.step} className="relative rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-100">
                {i < 3 && (
                  <div
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 hidden h-0.5 w-4 -translate-y-1/2 translate-x-full bg-gray-200 lg:block"
                  />
                )}
                <span className="text-xs font-bold text-brand-500 opacity-60">{item.step}</span>
                <h3 className="mt-3 text-base font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Features</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
              Everything you need to land your next role
            </h2>
            <p className="mt-5 text-lg text-gray-500">
              From discovering the right jobs to tracking every application — Job Tailor handles the busywork.
            </p>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-gray-100 bg-white p-7 transition-all hover:border-brand-200 hover:shadow-md hover:shadow-brand-50"
              >
                <span className="text-xs font-bold text-brand-500 opacity-50">{feature.number}</span>
                <h3 className="mt-3 text-base font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-gray-950 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Testimonials</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Real people. Real results.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white/5 p-7 ring-1 ring-white/10">
                {/* Stars */}
                <div className="mb-4 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-brand-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-gray-300">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Pricing</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Start free. Upgrade when you&apos;re ready.
            </p>
            <p className="mt-1.5 text-sm text-gray-400">
              Currently accepting UPI payments directly · Razorpay coming soon.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">₹0</span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">No credit card required.</p>
              </div>
              <ul className="flex-1 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Get started free
                </Link>
              </div>
            </div>

            {/* Pro */}
            <div className="relative flex flex-col rounded-2xl bg-gray-950 p-8 shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-brand-500 px-4 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Pro</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">₹499</span>
                  <span className="text-sm text-gray-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">Everything you need to land your next role.</p>
              </div>
              <ul className="flex-1 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-900 text-brand-400">
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="block w-full rounded-xl bg-brand-500 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-400"
                >
                  Start free → upgrade anytime
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gray-950 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="grid grid-cols-3 gap-6 mb-14">
            {[
              { value: "<100", label: "Early access spots" },
              { value: "6", label: "Job boards daily" },
              { value: "Free", label: "To get started" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 px-4 py-6 ring-1 ring-white/10">
                <p className="text-3xl font-extrabold text-brand-400">{s.value}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Your next job is already out there.
            <br />
            <span className="text-brand-400">Let AI find it for you.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-400">
            Be one of the first 100 users to get full access — free forever, with no strings attached.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full max-w-xs rounded-xl bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand-900/50 transition-all hover:bg-brand-400 sm:w-auto"
            >
              Claim your spot →
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-600">No credit card. Cancel anytime.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 bg-gray-950">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600">
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-white">Job Tailor</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-600">Find jobs that fit. Apply with confidence.</p>
            </div>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-end">
              {[
                { href: "#features", label: "Features" },
                { href: "#pricing", label: "Pricing" },
              ].map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-gray-500 transition-colors hover:text-gray-300">
                  {link.label}
                </a>
              ))}
              <Link href="/login" className="text-sm text-gray-500 transition-colors hover:text-gray-300">Sign in</Link>
              <Link href="/signup" className="text-sm text-gray-500 transition-colors hover:text-gray-300">Sign up</Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col items-center gap-1 border-t border-gray-800 pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-xs text-gray-600">&copy; 2026 Job Tailor. All rights reserved.</p>
            <p className="text-xs text-gray-600">Made with love in India</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
