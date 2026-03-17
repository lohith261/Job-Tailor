import type { Page } from "playwright";
import type { ApplyConfig } from "../auto-apply";
import * as readline from "readline";

/**
 * LinkedIn Easy Apply automation.
 * Multi-step modal — navigates each step, fills known fields, and ALWAYS
 * pauses before the final "Submit application" step for user confirmation.
 */
export async function applyLinkedIn(
  page: Page,
  config: ApplyConfig,
  coverLetter: string,
  dryRun: boolean
): Promise<boolean> {
  const { personal } = config;

  try {
    // Wait for Easy Apply button
    const easyApplyBtn = page.locator('button.jobs-apply-button, button:has-text("Easy Apply")').first();
    const visible = await easyApplyBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!visible) {
      console.log("  ℹ LinkedIn Easy Apply button not found — job may require external application");
      return false;
    }

    if (dryRun) {
      console.log("  [DRY RUN] Would click Easy Apply button");
      console.log("  [DRY RUN] Would navigate multi-step modal filling:");
      console.log(`    - Phone: ${personal.phone}`);
      console.log(`    - Cover letter textarea if present`);
      console.log("  [DRY RUN] Would PAUSE before final Submit for confirmation");
      return true;
    }

    await easyApplyBtn.click();
    await page.waitForTimeout(1500);

    let stepCount = 0;
    const maxSteps = 10;

    while (stepCount < maxSteps) {
      stepCount++;

      // Fill phone if visible
      const phoneInput = page.locator('input[id*="phoneNumber" i], input[aria-label*="phone" i]').first();
      if (await phoneInput.isVisible({ timeout: 800 }).catch(() => false)) {
        const currentVal = await phoneInput.inputValue().catch(() => "");
        if (!currentVal) await phoneInput.fill(personal.phone);
      }

      // Fill cover letter textarea if visible
      const coverLetterArea = page.locator('textarea[aria-label*="cover letter" i], textarea[id*="cover-letter" i]').first();
      if (await coverLetterArea.isVisible({ timeout: 800 }).catch(() => false)) {
        await coverLetterArea.fill(coverLetter.slice(0, 2000));
        console.log("  ✓ Filled cover letter textarea");
      }

      // Check for submit button (final step)
      const submitBtn = page.locator('button[aria-label*="Submit application" i]').first();
      if (await submitBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        console.log("\n  ⚠️  FINAL STEP: Ready to submit application on LinkedIn.");
        console.log("  Please review the form in the browser window.");

        const confirmed = await promptUser("  Submit application now? (yes/no): ");
        if (confirmed) {
          await submitBtn.click();
          console.log("  ✓ Application submitted on LinkedIn!");
          return true;
        } else {
          console.log("  ⏭  Skipped — application not submitted");
          return false;
        }
      }

      // Try to advance to next step
      const nextBtn = page.locator('button[aria-label*="Continue to next step" i], button:has-text("Next")').first();
      const reviewBtn = page.locator('button[aria-label*="Review your application" i], button:has-text("Review")').first();

      if (await reviewBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await reviewBtn.click();
        await page.waitForTimeout(1000);
      } else if (await nextBtn.isVisible({ timeout: 800 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      } else {
        console.log("  ℹ No Next/Review/Submit button found — stopping modal navigation");
        break;
      }
    }

    return false;
  } catch (err) {
    console.error("  ✗ LinkedIn automation error:", err);
    return false;
  }
}

function promptUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes" || answer.trim().toLowerCase() === "y");
    });
  });
}
