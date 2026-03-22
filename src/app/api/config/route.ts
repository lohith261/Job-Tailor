import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonArray, serializeConfig } from "@/lib/json-arrays";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET() {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  let config = await prisma.searchConfig.findFirst({
    where: { isActive: true, userId },
  });

  if (!config) {
    config = await prisma.searchConfig.create({
      data: {
        userId,
        name: "Default",
        titles: toJsonArray(["Software Engineer", "Frontend Developer"]),
        locations: toJsonArray(["Remote"]),
        locationType: "remote",
        includeKeywords: toJsonArray(["React", "TypeScript", "Node.js"]),
        excludeKeywords: toJsonArray([]),
        blacklistedCompanies: toJsonArray([]),
        industries: toJsonArray([]),
      },
    });
  }

  return NextResponse.json(serializeConfig(config as unknown as Record<string, unknown>));
}

export async function PUT(req: NextRequest) {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  const body = await req.json();

  const existing = await prisma.searchConfig.findFirst({
    where: { isActive: true, userId },
  });

  const data = {
    titles: body.titles ? toJsonArray(body.titles) : undefined,
    locations: body.locations ? toJsonArray(body.locations) : undefined,
    locationType: body.locationType ?? undefined,
    experienceLevel: body.experienceLevel ?? undefined,
    salaryMin: body.salaryMin ?? undefined,
    salaryMax: body.salaryMax ?? undefined,
    companySize: body.companySize ?? undefined,
    industries: body.industries ? toJsonArray(body.industries) : undefined,
    includeKeywords: body.includeKeywords ? toJsonArray(body.includeKeywords) : undefined,
    excludeKeywords: body.excludeKeywords ? toJsonArray(body.excludeKeywords) : undefined,
    blacklistedCompanies: body.blacklistedCompanies ? toJsonArray(body.blacklistedCompanies) : undefined,
    pipelineThreshold: body.pipelineThreshold != null ? Number(body.pipelineThreshold) : undefined,
    pipelineMaxJobs: body.pipelineMaxJobs != null ? Number(body.pipelineMaxJobs) : undefined,
    pipelineTone: body.pipelineTone ?? undefined,
  };

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  if (existing) {
    const config = await prisma.searchConfig.update({
      where: { id: existing.id },
      data: cleanData,
    });
    return NextResponse.json(serializeConfig(config as unknown as Record<string, unknown>));
  }

  const config = await prisma.searchConfig.create({
    data: {
      userId,
      titles: toJsonArray(body.titles || []),
      locations: toJsonArray(body.locations || []),
      locationType: body.locationType || "any",
      experienceLevel: body.experienceLevel,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      companySize: body.companySize,
      industries: toJsonArray(body.industries || []),
      includeKeywords: toJsonArray(body.includeKeywords || []),
      excludeKeywords: toJsonArray(body.excludeKeywords || []),
      blacklistedCompanies: toJsonArray(body.blacklistedCompanies || []),
      pipelineThreshold: body.pipelineThreshold != null ? Number(body.pipelineThreshold) : undefined,
      pipelineMaxJobs: body.pipelineMaxJobs != null ? Number(body.pipelineMaxJobs) : undefined,
      pipelineTone: body.pipelineTone ?? undefined,
    },
  });

  return NextResponse.json(serializeConfig(config as unknown as Record<string, unknown>));
}
