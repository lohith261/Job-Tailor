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
    salaryMin: config.salaryMin || undefined,
    salaryMax: config.salaryMax || undefined,
    companySize: config.companySize || undefined,
    industries: fromJsonArray(config.industries),
    includeKeywords: fromJsonArray(config.includeKeywords),
    excludeKeywords: fromJsonArray(config.excludeKeywords),
    blacklistedCompanies: fromJsonArray(config.blacklistedCompanies),
  };
}
