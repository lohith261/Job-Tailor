import type { Page } from "playwright";
import type { ApplyConfig } from "../auto-apply";

/**
 * Generic form filler.
 * Tries common aria-label / name / id / placeholder patterns to fill
 * contact info and cover letter on any job application page.
 */
export async function applyGeneric(
  page: Page,
  config: ApplyConfig,
  coverLetter: string,
  dryRun: boolean
): Promise<boolean> {
  const { personal } = config;

  const fieldMap: Array<{ selectors: string[]; value: string; label: string }> = [
    {
      label: "First name",
      selectors: [
        'input[name*="first" i]', 'input[id*="first" i]',
        'input[placeholder*="first" i]', '[aria-label*="first name" i]',
      ],
      value: personal.firstName,
    },
    {
      label: "Last name",
      selectors: [
        'input[name*="last" i]', 'input[id*="last" i]',
        'input[placeholder*="last" i]', '[aria-label*="last name" i]',
      ],
      value: personal.lastName,
    },
    {
      label: "Email",
      selectors: [
        'input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]',
      ],
      value: personal.email,
    },
    {
      label: "Phone",
      selectors: [
        'input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]',
        'input[placeholder*="phone" i]',
      ],
      value: personal.phone,
    },
    {
      label: "LinkedIn",
      selectors: [
        'input[name*="linkedin" i]', 'input[id*="linkedin" i]',
        'input[placeholder*="linkedin" i]',
      ],
      value: personal.linkedInUrl,
    },
    {
      label: "Cover letter",
      selectors: [
        'textarea[name*="cover" i]', 'textarea[id*="cover" i]',
        '[aria-label*="cover letter" i]', 'textarea[placeholder*="cover" i]',
      ],
      value: coverLetter,
    },
  ];

  let filledCount = 0;
  for (const field of fieldMap) {
    for (const selector of field.selectors) {
      try {
        const el = page.locator(selector).first();
        const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
        if (!visible) continue;

        if (dryRun) {
          console.log(`  [DRY RUN] Would fill "${field.label}" → "${field.value.slice(0, 40)}${field.value.length > 40 ? "…" : ""}"`);
        } else {
          await el.fill(field.value);
          console.log(`  ✓ Filled "${field.label}"`);
        }
        filledCount++;
        break; // move to next field once one selector matches
      } catch {
        // selector not found — try next
      }
    }
  }

  return filledCount > 0;
}
