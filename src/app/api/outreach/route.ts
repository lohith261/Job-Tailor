import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOutreachEmail } from "@/lib/ai/outreach";

// GET  /api/outreach — list all saved outreach emails (newest first)
export async function GET() {
  try {
    const records = await prisma.outreachEmail.findMany({
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
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("GET /api/outreach error:", err);
    return NextResponse.json({ error: "Failed to fetch outreach history" }, { status: 500 });
  }
}

// POST /api/outreach — research company + generate email
export async function POST(req: NextRequest) {
  try {
    const { companyUrl, resumeId } = await req.json();

    if (!companyUrl) {
      return NextResponse.json({ error: "companyUrl is required" }, { status: 400 });
    }

    // Fetch primary resume (or specified one) for context
    const resume = resumeId
      ? await prisma.resume.findUnique({ where: { id: resumeId } })
      : await prisma.resume.findFirst({ where: { isPrimary: true } })
        ?? await prisma.resume.findFirst({ orderBy: { createdAt: "desc" } });

    const resumeText = resume?.textContent ?? "";
    const resumeName = resume?.name ?? "";

    // Research + generate
    const result = await generateOutreachEmail({ companyUrl, resumeText, resumeName });

    // Persist to DB
    const saved = await prisma.outreachEmail.create({
      data: {
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
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("POST /api/outreach error:", err);
    return NextResponse.json({ error: "Failed to generate outreach email" }, { status: 500 });
  }
}
