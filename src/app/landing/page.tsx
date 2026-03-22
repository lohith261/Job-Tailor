"use client";

import Link from "next/link";
import { useState } from "react";

const FEATURES = [
  {
    icon: "🔍",
    title: "Smart Job Matching",
    description:
      "Scrapes RemoteOK, LinkedIn, Remotive and more daily. Every job gets a match score based on your target role, salary, location and skills.",
  },
  {
    icon: "📄",
    title: "AI Resume Analysis",
    description:
      "Upload your resume once. Get a keyword match score, missing skills, and specific rewrite suggestions for every job you're interested in.",
  },
  {
    icon: "✉️",
    title: "Cover Letters in Seconds",
    description:
      "One click generates a personalised cover letter in your tone — Professional, Conversational, or Enthusiastic. Editable and saved per job.",
  },
  {
    icon: "📊",
    title: "Application Tracker",
    description:
      "Drag-and-drop Kanban board tracks every application from Bookmarked to Offer. Follow-up reminders so nothing falls through the cracks.",
  },
  {
    icon: "🤖",
    title: "Full Automation Pipeline",
    description:
      "One click: scrape → score → analyse → generate cover letters → auto-track. Your entire job search workflow in 60 seconds.",
  },
  {
    icon: "📈",
    title: "Analytics That Guide You",
    description:
      "See your application funnel, which sources convert best, which keywords you're missing, and how your match scores trend week by week.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Configure",
    description:
      "Set your target titles, salary, location, skills. Takes 5 minutes.",
  },
  {
    step: "02",
    title: "Scrape",
    description:
      "We pull fresh jobs from 6 boards every day and score them against your profile.",
  },
  {
    step: "03",
    title: "Apply",
    description:
      "Get tailored resumes and cover letters for your top matches. Apply in minutes.",
  },
  {
    step: "04",
    title: "Track",
    description:
      "Follow every application from first contact to offer on your Kanban board.",
  },
];

const FREE_FEATURES = [
  "Opportunity Inbox (unlimited scraping)",
  "Application Tracker (Kanban board)",
  "Analytics dashboard (basic)",
  "1 resume upload",
  "3 AI resume analyses/month",
  "3 AI cover letters/month",
  "2 cold outreach emails/month",
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

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="text-lg font-bold text-indigo-600">Job-Tailor</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 sm:flex">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-indigo-600"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-indigo-600"
            >
              Pricing
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-indigo-600"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Start free →
            </Link>
          </div>

          {/* Mobile hamburger */}
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

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Start free →
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 to-white pb-16 pt-20 text-center sm:pb-24 sm:pt-28">
        {/* Background decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-100 opacity-40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-6 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700">
            🎯 Built for Indian job seekers
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Find jobs that fit.{" "}
            <span className="text-indigo-600">Apply with confidence.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
            Job-Tailor scrapes 6 job boards daily, scores every listing against
            your profile, and generates tailored cover letters — so you spend
            time applying, not searching.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full max-w-xs rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 sm:w-auto"
            >
              Start free — no card needed
            </Link>
            <a
              href="#features"
              className="w-full max-w-xs rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:w-auto"
            >
              See how it works
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              6 job boards
            </span>
            <span className="hidden text-gray-300 sm:block">·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              AI-powered scoring
            </span>
            <span className="hidden text-gray-300 sm:block">·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Tailored cover letters
            </span>
            <span className="hidden text-gray-300 sm:block">·</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              ₹499/month Pro
            </span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to land your next role
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
              From discovering the right jobs to tracking every application —
              Job-Tailor handles the busywork so you can focus on what matters.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl transition-colors group-hover:bg-indigo-100">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-indigo-50/40 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From setup to offer in four simple steps.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, index) => (
              <div key={item.step} className="relative">
                {/* Connector line (hidden on last item and mobile) */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-full top-6 hidden h-0.5 w-full -translate-y-1/2 bg-indigo-200 lg:block"
                    style={{ width: "calc(100% - 3rem)", left: "calc(100% - 0.5rem)" }}
                  />
                )}
                <div className="rounded-2xl border border-white bg-white p-6 shadow-sm">
                  <div className="mb-4 text-sm font-bold text-indigo-600 opacity-60">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-base font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Start free. Upgrade when you&apos;re ready.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Switching to Razorpay soon — currently accepting UPI payments directly.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Free card */}
            <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">₹0</span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  No credit card required.
                </p>
              </div>

              <ul className="flex-1 space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="/signup"
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Get started free
                </Link>
              </div>
            </div>

            {/* Pro card */}
            <div className="relative flex flex-col rounded-2xl border-2 border-indigo-500 bg-white p-8 shadow-lg shadow-indigo-100">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-indigo-600 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Pro</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">₹499</span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Everything you need to land your next role.
                </p>
              </div>

              <ul className="flex-1 space-y-3">
                {PRO_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="/signup"
                  className="block w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Start free → upgrade anytime
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300"
            >
              Start free today
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              No credit card needed. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── Social proof / Early access ── */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-3 text-4xl">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900">
              Built for Indian job seekers
            </h2>
            <p className="mt-3 text-base text-gray-500">
              Early access — be one of the first 100 users.
            </p>

            {/* Counter visual */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-8 py-4">
                <span className="text-3xl font-extrabold text-indigo-600">
                  &lt;100
                </span>
                <span className="mt-1 text-xs font-medium text-gray-500">
                  spots remaining
                </span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-8 py-4">
                <span className="text-3xl font-extrabold text-indigo-600">
                  6
                </span>
                <span className="mt-1 text-xs font-medium text-gray-500">
                  job boards scraped
                </span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-8 py-4">
                <span className="text-3xl font-extrabold text-indigo-600">
                  Free
                </span>
                <span className="mt-1 text-xs font-medium text-gray-500">
                  to get started
                </span>
              </div>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                Claim your spot →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <span className="text-base font-bold text-indigo-600">
                  Job-Tailor
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Find jobs that fit. Apply with confidence.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-end">
              <a
                href="#features"
                className="text-sm text-gray-500 transition-colors hover:text-indigo-600"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-500 transition-colors hover:text-indigo-600"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="text-sm text-gray-500 transition-colors hover:text-indigo-600"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm text-gray-500 transition-colors hover:text-indigo-600"
              >
                Sign up
              </Link>
            </nav>
          </div>

          <div className="mt-8 flex flex-col items-center gap-1 border-t border-gray-100 pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm text-gray-400">
              &copy; 2025 Job-Tailor. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
