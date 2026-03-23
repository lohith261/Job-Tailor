import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOutreachEmail, type OutreachTone } from "@/lib/ai/outreach";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { checkQuota } from "@/lib/quota";

export async function GET() {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const records = await prisma.outreachEmail.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        companyUrl: r.companyUrl,
        companyName: r.companyName,
        companyInfo: JSON.parse(r.companyInfo),
        emailSubject: r.emailSubject,
        emailBody: r.emailBody,
        resumeId: r.resumeId,
        replied: r.replied,
        repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("GET /api/outreach error:", err);
    return NextResponse.json({ error: "Failed to fetch outreach history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const quota = await checkQuota(userId, "outreach");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "free_limit_reached", message: "You've used your 2 free outreach emails this month. Upgrade to Pro for unlimited.", upgradeUrl: "/pricing" },
        { status: 402 }
      );
    }

    const VALID_TONES: OutreachTone[] = ["Professional", "Friendly", "Concise", "Enthusiastic"];

    const { companyUrl, resumeId, tone } = await req.json();
    if (!companyUrl) return NextResponse.json({ error: "companyUrl is required" }, { status: 400 });

    const resolvedTone: OutreachTone = VALID_TONES.includes(tone) ? tone : "Professional";

    const resume = resumeId
      ? await prisma.resume.findFirst({ where: { id: resumeId, userId } })
      : await prisma.resume.findFirst({ where: { userId, isPrimary: true } })
        ?? await prisma.resume.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });

    const resumeText = resume?.textContent ?? "";
    const resumeName = resume?.name ?? "";

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const candidateName = profile?.name || undefined;

    const result = await generateOutreachEmail({ companyUrl, resumeText, resumeName, candidateName, tone: resolvedTone });

    const saved = await prisma.outreachEmail.create({
      data: {
        userId,
        companyUrl,
        companyName: result.companyName,
        companyInfo: JSON.stringify(result.companyInfo),
        emailSubject: result.emailSubject,
        emailBody: result.emailBody,
        resumeId: resume?.id ?? null,
      },
    });

    return NextResponse.json({
      id: saved.id,
      companyUrl: saved.companyUrl,
      companyName: saved.companyName,
      companyInfo: result.companyInfo,
      emailSubject: saved.emailSubject,
      emailBody: saved.emailBody,
      resumeId: saved.resumeId,
      replied: saved.replied,
      repliedAt: saved.repliedAt ? saved.repliedAt.toISOString() : null,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("POST /api/outreach error:", err);
    return NextResponse.json({ error: "Failed to generate outreach email" }, { status: 500 });
  }
}
