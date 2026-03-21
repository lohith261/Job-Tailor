import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { serializeJob } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const source = searchParams.get("source");
  const sortBy = searchParams.get("sortBy") || "matchScore";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const minScore = searchParams.get("minScore");
  const maxScore = searchParams.get("maxScore");

  const where: Prisma.JobWhereInput = { userId };

  if (status && status !== "all") {
    where.status = status;
  }

  if (!status || status === "all") {
    where.status = { not: "dismissed" };
  }

  if (source) {
    where.source = source;
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { company: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const validSortFields = ["matchScore", "createdAt", "postedAt"] as const;
  const orderField = validSortFields.includes(sortBy as typeof validSortFields[number])
    ? sortBy
    : "matchScore";

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { [orderField]: sortOrder === "asc" ? "asc" : "desc" },
    take: 200,
  });

  const searchConfig = await getActiveSearchConfig(userId);
  let serializedJobs = jobs.map((j) =>
    serializeJob(j as unknown as Record<string, unknown>, searchConfig)
  );

  const min = minScore ? parseInt(minScore, 10) : null;
  const max = maxScore ? parseInt(maxScore, 10) : null;

  if (min != null) {
    serializedJobs = serializedJobs.filter((job) => Number(job.matchScore) >= min);
  }
  if (max != null) {
    serializedJobs = serializedJobs.filter((job) => Number(job.matchScore) <= max);
  }

  if (orderField === "matchScore") {
    serializedJobs.sort((a, b) =>
      sortOrder === "asc"
        ? Number(a.matchScore) - Number(b.matchScore)
        : Number(b.matchScore) - Number(a.matchScore)
    );
  }

  const [allCount, newCount, savedCount, appliedCount, archivedCount] =
    await Promise.all([
      prisma.job.count({ where: { userId, status: { not: "dismissed" } } }),
      prisma.job.count({ where: { userId, status: "new" } }),
      prisma.job.count({ where: { userId, status: "saved" } }),
      prisma.job.count({ where: { userId, status: "applied" } }),
      prisma.job.count({ where: { userId, status: "archived" } }),
    ]);

  const sourcesRaw = await prisma.job.findMany({
    where: { userId },
    select: { source: true },
    distinct: ["source"],
  });

  return NextResponse.json({
    jobs: serializedJobs.slice(0, 100),
    counts: {
      all: allCount,
      new: newCount,
      saved: savedCount,
      applied: appliedCount,
      archived: archivedCount,
    },
    sources: sourcesRaw.map((s) => s.source),
  });
}
