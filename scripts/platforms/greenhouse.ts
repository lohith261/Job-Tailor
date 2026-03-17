import type { Page } from "playwright";
import type { ApplyConfig } from "../auto-apply";
import * as path from "path";
import * as fs from "fs";

/**
 * Greenhouse ATS form filler.
 * Stable selectors for boards.greenhouse.io application forms.
 */
export async function applyGreenhouse(
  page: Page,
  config: ApplyConfig,
  coverLetter: string,
  dryRun: boolean,
  resumePath?: string
): Promise<boolean> {
  const { personal } = config;

  const fields: Array<{ selector: string; value: string; label: string }> = [
    { label: "First name",    selector: "#first_name",  value: personal.firstName },
    { label: "Last name",     selector: "#last_name",   value: personal.lastName },
    { label: "Email",         selector: "#email",       value: personal.email },
    { label: "Phone",         selector: "#phone",       value: personal.phone },
    { label: "LinkedIn",      selector: 'input[name*="linkedin" i]', value: personal.linkedInUrl },
    { label: "Website",       selector: 'input[name*="website" i]',  value: personal.websiteUrl },
    { label: "Cover letter",  selector: "#cover_letter", value: coverLetter },
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

  // Resume upload
  if (resumePath && fs.existsSync(resumePath) && !dryRun) {
    try {
      const fileInput = page.locator('input[type="file"][name*="resume" i], input[type="file"][id*="resume" i]').first();
      const visible = await fileInput.isVisible({ timeout: 1500 }).catch(() => false);
      if (visible) {
        await fileInput.setInputFiles(path.resolve(resumePath));
        console.log(`  ✓ Uploaded resume: ${path.basename(resumePath)}`);
      }
    } catch {
      console.log(`  ℹ Resume upload field not found or not accessible`);
    }
  } else if (resumePath && dryRun) {
    console.log(`  [DRY RUN] Would upload resume: ${resumePath}`);
  }

  return filledCount > 0;
}
