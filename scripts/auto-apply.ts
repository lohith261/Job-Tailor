/**
 * auto-apply.ts — Local Playwright browser automation for job applications.
 *
 * Usage:
 *   npm run auto-apply:dry          # Preview what would be filled (no submissions)
 *   npm run auto-apply              # Live run — opens browser, fills forms, waits for confirmation
 *   npm run auto-apply -- --limit 3  # Process only the first 3 jobs
 *
 * Setup:
 *   1. cp scripts/apply-config.example.json scripts/apply-config.json
 *   2. Fill in your personal info in apply-config.json
 *   3. Ensure the app is running (npm run dev) or set baseUrl to your Vercel URL
 *   4. Run: npm run auto-apply:dry
 *
 * Supported platforms: LinkedIn Easy Apply, Greenhouse, Lever, generic forms.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import { applyGeneric } from "./platforms/generic";
import { applyGreenhouse } from "./platforms/greenhouse";
import { applyLever } from "./platforms/lever";
import { applyLinkedIn } from "./platforms/linkedin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyConfig {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedInUrl: string;
    githubUrl: string;
    websiteUrl: string;
    location: string;
  };
  api: {
    baseUrl: string;
  };
}

interface ReadyJob {
  id: string;
  title: string;
  company: string;
  url: string;
  matchScore: number;
  application: { id: string; status: string } | null;
  coverLetter: { content: string } | null;
}

// ─── CLI argument parsing ─────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    auto: args.includes("--auto"),
    limit: (() => {
      const idx = args.indexOf("--limit");
      return idx >= 0 ? parseInt(args[idx + 1] ?? "5") : 5;
    })(),
  };
}

// ─── Platform detection ───────────────────────────────────────────────────────

function detectPlatform(url: string): "linkedin" | "greenhouse" | "lever" | "generic" {
  if (url.includes("linkedin.com")) return "linkedin";
  if (url.includes("greenhouse.io") || url.includes("boards.greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co") || url.includes("jobs.lever.co")) return "lever";
  return "generic";
}

// ─── User prompt ──────────────────────────────────────────────────────────────

function promptYN(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(["y", "yes"].includes(answer.trim().toLowerCase()));
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dryRun, auto, limit } = parseArgs();

  console.log(`\n🤖 CustomJobFinder — Auto Apply Script`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no submissions)" : "LIVE"}`);
  console.log(`Confirmation: ${auto ? "automatic (--auto flag)" : "manual (will prompt before each submit)"}\n`);

  // Load config
  const configPath = path.join(__dirname, "apply-config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Config not found at ${configPath}`);
    console.error(`   Run: cp scripts/apply-config.example.json scripts/apply-config.json`);
    console.error(`   Then fill in your personal info.`);
    process.exit(1);
  }
  const config: ApplyConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const baseUrl = config.api.baseUrl.replace(/\/$/, "");

  // Fetch ready jobs
  console.log(`📡 Fetching ready-to-apply jobs from ${baseUrl}/api/pipeline/ready…`);
  let jobs: ReadyJob[];
  try {
    const res = await fetch(`${baseUrl}/api/pipeline/ready`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    jobs = (await res.json()) as ReadyJob[];
  } catch (err) {
    console.error(`❌ Failed to fetch jobs: ${err}`);
    console.error(`   Is the app running? Try: npm run dev`);
    process.exit(1);
  }

  if (jobs.length === 0) {
    console.log("ℹ️  No jobs ready to apply. Run the Pipeline first.");
    process.exit(0);
  }

  const toProcess = jobs.slice(0, limit);
  console.log(`Found ${jobs.length} ready job(s). Processing ${toProcess.length} (limit: ${limit}).\n`);

  // Launch browser
  const browser = await chromium.launch({ headless: dryRun });
  const context = await browser.newContext();

  const summary = { attempted: 0, succeeded: 0, skipped: 0, errors: 0 };

  for (const job of toProcess) {
    console.log(`\n─── ${job.title} @ ${job.company} (score: ${job.matchScore}) ───`);
    console.log(`    URL: ${job.url}`);
    summary.attempted++;

    if (!job.coverLetter) {
      console.log("  ⚠️  No cover letter — run Pipeline first. Skipping.");
      summary.skipped++;
      continue;
    }

    const platform = detectPlatform(job.url);
    console.log(`  Platform: ${platform}`);

    // Ask user before applying (unless --auto)
    if (!auto && !dryRun) {
      const proceed = await promptYN(`  Apply to this job? (y/n): `);
      if (!proceed) {
        console.log("  ⏭  Skipped by user");
        summary.skipped++;
        continue;
      }
    }

    const page = await context.newPage();
    let success = false;

    try {
      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1500);

      switch (platform) {
        case "linkedin":
          success = await applyLinkedIn(page, config, job.coverLetter.content, dryRun);
          break;
        case "greenhouse":
          success = await applyGreenhouse(page, config, job.coverLetter.content, dryRun);
          break;
        case "lever":
          success = await applyLever(page, config, job.coverLetter.content, dryRun);
          break;
        default:
          success = await applyGeneric(page, config, job.coverLetter.content, dryRun);
      }

      if (success && !dryRun && job.application) {
        // Mark application as applied in the app
        try {
          await fetch(`${baseUrl}/api/applications/${job.application.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "applied", confirmedApplied: true }),
          });
          console.log("  ✓ Marked as Applied in tracker");
        } catch {
          console.log("  ℹ Could not update tracker status (non-fatal)");
        }
      }

      if (success) summary.succeeded++;
      else summary.skipped++;

    } catch (err) {
      console.error(`  ✗ Error: ${err}`);
      summary.errors++;
    } finally {
      if (!dryRun) {
        await page.waitForTimeout(2000);
      }
      await page.close();
    }
  }

  await browser.close();

  console.log(`\n─── Summary ───`);
  console.log(`  Attempted : ${summary.attempted}`);
  console.log(`  Succeeded : ${summary.succeeded}`);
  console.log(`  Skipped   : ${summary.skipped}`);
  console.log(`  Errors    : ${summary.errors}`);
  if (dryRun) console.log(`\n  This was a dry run — no applications were submitted.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
