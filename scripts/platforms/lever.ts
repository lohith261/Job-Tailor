import type { Page } from "playwright";
import type { ApplyConfig } from "../auto-apply";

/**
 * Lever ATS form filler.
 * Stable selectors for jobs.lever.co single-page application forms.
 */
export async function applyLever(
  page: Page,
  config: ApplyConfig,
  coverLetter: string,
  dryRun: boolean
): Promise<boolean> {
  const { personal } = config;

  const fullName = `${personal.firstName} ${personal.lastName}`.trim();

  const fields: Array<{ selector: string; value: string; label: string }> = [
    { label: "Full name",     selector: 'input[name="name"]',                    value: fullName },
    { label: "Email",         selector: 'input[name="email"]',                   value: personal.email },
    { label: "Phone",         selector: 'input[name="phone"]',                   value: personal.phone },
    { label: "LinkedIn",      selector: 'input[name="urls[LinkedIn]"]',          value: personal.linkedInUrl },
    { label: "GitHub",        selector: 'input[name="urls[GitHub]"]',            value: personal.githubUrl },
    { label: "Portfolio",     selector: 'input[name="urls[Portfolio]"]',         value: personal.websiteUrl },
    { label: "Cover letter",  selector: 'textarea[name="comments"]',             value: coverLetter },
  ];

  let filledCount = 0;
  for (const field of fields) {
    try {
      const el = page.locator(field.selector).first();
      const visible = await el.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) continue;

      if (dryRun) {
        console.log(`  [DRY RUN] Would fill "${field.label}" → "${field.value.slice(0, 60)}…"`);
      } else {
        await el.fill(field.value);
        console.log(`  ✓ Filled "${field.label}"`);
      }
      filledCount++;
    } catch {
      // field not present on this form — skip
    }
  }

  return filledCount > 0;
}
