import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { runAllScrapers } from "@/lib/scrapers";
import { calculateMatchScore } from "@/lib/scoring";
import { toJsonArray } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST() {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  try {
    const searchConfig = await getActiveSearchConfig(userId);
    const result = await runAllScrapers(searchConfig);
    const uniqueJobs = result.jobs;

    let newJobCount = 0;
    for (const job of uniqueJobs) {
      const score = calculateMatchScore(job, searchConfig);
      try {
        await prisma.job.upsert({
          where: {
            title_company_source_userId: {
              title: job.title,
              company: job.company,
              source: job.source,
              userId,
            },
          },
          update: {
            description: job.description,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            matchScore: score,
          },
          create: {
            userId,
            title: job.title,
            company: job.company,
            location: job.location,
            locationType: job.locationType,
            url: job.url,
            source: job.source,
            description: job.description,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            experienceLevel: job.experienceLevel,
            companySize: job.companySize,
            industry: job.industry,
            tags: toJsonArray(job.tags || []),
            postedAt: job.postedAt,
            matchScore: score,
            status: "new",
          },
        });
        newJobCount++;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        console.error("Upsert error for job:", job.title, err);
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      scraped: result.totalBeforeDedup,
      unique: result.totalAfterDedup,
      newJobs: newJobCount,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "Scraping failed", details: String(error) }, { status: 500 });
  }
}
