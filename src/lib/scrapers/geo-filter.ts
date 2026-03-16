/**
 * Geo-aware location preference:
 * - Remote jobs → always accepted regardless of geography
 * - India-based jobs → accepted at any location type (remote, hybrid, onsite)
 * - All other non-remote jobs → rejected (we don't want to relocate internationally)
 */

const INDIA_KEYWORDS = [
  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "bombay",
  "delhi",
  "new delhi",
  "ncr",
  "hyderabad",
  "pune",
  "chennai",
  "madras",
  "kolkata",
  "calcutta",
  "noida",
  "gurgaon",
  "gurugram",
  "ahmedabad",
  "jaipur",
  "kochi",
  "cochin",
  "coimbatore",
  "indore",
  "bhopal",
  "nagpur",
  "vizag",
  "visakhapatnam",
];

/**
 * Returns true if this job's location makes it acceptable to apply to.
 *
 * Acceptable conditions (in order):
 * 1. locationType is "remote" — open to the world, always accept
 * 2. location string contains "remote", "worldwide", or "anywhere" — effectively remote
 * 3. location is blank/undefined — no restriction listed, treat as open
 * 4. location is in India — hybrid/onsite India jobs are acceptable
 *
 * Everything else (onsite/hybrid outside India) is rejected.
 */
export function passesGeoFilter(
  location: string | undefined | null,
  locationType: string | undefined | null
): boolean {
  // Remote jobs are always fine
  if (locationType === "remote") return true;

  const loc = (location ?? "").toLowerCase().trim();

  // No location info, or explicitly open worldwide
  if (!loc || loc.includes("remote") || loc.includes("worldwide") || loc.includes("anywhere")) {
    return true;
  }

  // India-based jobs — hybrid and onsite are both acceptable
  if (INDIA_KEYWORDS.some((kw) => loc.includes(kw))) return true;

  // Non-remote, non-India — skip
  return false;
}
