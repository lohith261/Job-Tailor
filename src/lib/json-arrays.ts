/**
 * Helpers for JSON array fields in SQLite.
 * SQLite doesn't support native arrays, so we store them as JSON strings.
 */

import { calculateMatchDetails, calculatePriorityInsights } from "@/lib/scoring";
import type { JobMatchDetails, JobPriorityInsights, RawJob, SearchConfigData } from "@/types";

type SerializedJob = Record<string, unknown> & {
  tags: string[];
  matchScore?: number;
  matchDetails?: JobMatchDetails;
  priorityInsights?: JobPriorityInsights;
};

export function toJsonArray(arr: string[]): string {
  return JSON.stringify(arr);
}

export function fromJsonArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convert a Job record from DB (JSON string tags) to API response (array tags) */
export function serializeJob(
  job: Record<string, unknown>,
  config?: SearchConfigData
): SerializedJob {
  const serialized: SerializedJob = {
    ...job,
    tags: fromJsonArray(job.tags as string),
  };

  if (!config) return serialized;

  const rawJob: RawJob = {
    title: String(serialized.title ?? ""),
    company: String(serialized.company ?? ""),
    location: serialized.location ? String(serialized.location) : undefined,
    locationType: serialized.locationType ? String(serialized.locationType) : undefined,
    url: String(serialized.url ?? ""),
    source: String(serialized.source ?? ""),
    description: serialized.description ? String(serialized.description) : undefined,
    salaryMin: typeof serialized.salaryMin === "number" ? serialized.salaryMin : undefined,
    salaryMax: typeof serialized.salaryMax === "number" ? serialized.salaryMax : undefined,
    salaryCurrency: serialized.salaryCurrency ? String(serialized.salaryCurrency) : undefined,
    experienceLevel: serialized.experienceLevel ? String(serialized.experienceLevel) : undefined,
    companySize: serialized.companySize ? String(serialized.companySize) : undefined,
    industry: serialized.industry ? String(serialized.industry) : undefined,
    tags: serialized.tags,
    postedAt: serialized.postedAt instanceof Date
      ? serialized.postedAt
      : serialized.postedAt
      ? new Date(String(serialized.postedAt))
      : undefined,
  };

  const matchDetails = calculateMatchDetails(rawJob, config);

  return {
    ...serialized,
    matchScore: matchDetails.totalScore,
    matchDetails,
    priorityInsights: calculatePriorityInsights(rawJob, matchDetails),
  };
}

/** Parse timeline JSON string to TimelineEvent array */
export function parseTimeline(json: string | null | undefined): import("@/types").TimelineEvent[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Convert a SearchConfig record from DB to API response with parsed arrays */
export function serializeConfig(config: Record<string, unknown>) {
  return {
    ...config,
    titles: fromJsonArray(config.titles as string),
    locations: fromJsonArray(config.locations as string),
    locationType: config.locationType ?? "",
    experienceLevel: config.experienceLevel ?? "",
    companySize: config.companySize ?? "",
    industries: fromJsonArray(config.industries as string),
    skills: fromJsonArray(config.skills as string),
    includeKeywords: fromJsonArray(config.includeKeywords as string),
    excludeKeywords: fromJsonArray(config.excludeKeywords as string),
    blacklistedCompanies: fromJsonArray(config.blacklistedCompanies as string),
    preferredCompanies: fromJsonArray(config.preferredCompanies as string),
    jobType: config.jobType ?? "",
    currency: config.currency ?? "INR",
  };
}
