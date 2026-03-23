import { prisma } from "@/lib/db";
import { fromJsonArray, toJsonArray } from "@/lib/json-arrays";
import type { SearchConfigData } from "@/types";

export async function getActiveSearchConfig(userId: string): Promise<SearchConfigData> {
  let config = await prisma.searchConfig.findFirst({
    where: { isActive: true, userId },
  });

  if (!config) {
    config = await prisma.searchConfig.create({
      data: {
        userId,
        name: "Default",
        titles: toJsonArray(["Software Engineer"]),
        locations: toJsonArray(["Remote"]),
        locationType: "remote",
        includeKeywords: toJsonArray([]),
        excludeKeywords: toJsonArray([]),
        blacklistedCompanies: toJsonArray([]),
        industries: toJsonArray([]),
      },
    });
  }

  return {
    titles: fromJsonArray(config.titles),
    locations: fromJsonArray(config.locations),
    locationType: config.locationType || undefined,
    experienceLevel: config.experienceLevel || undefined,
    yearsOfExperience: config.yearsOfExperience || undefined,
    salaryMin: config.salaryMin || undefined,
    salaryMax: config.salaryMax || undefined,
    currency: config.currency || "INR",
    companySize: config.companySize || undefined,
    industries: fromJsonArray(config.industries),
    skills: fromJsonArray(config.skills),
    includeKeywords: fromJsonArray(config.includeKeywords),
    excludeKeywords: fromJsonArray(config.excludeKeywords),
    blacklistedCompanies: fromJsonArray(config.blacklistedCompanies),
    preferredCompanies: fromJsonArray(config.preferredCompanies),
    jobType: config.jobType || undefined,
  };
}
