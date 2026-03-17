import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCoverLetter } from "@/lib/ai/cover-letter";

// GET /api/jobs/[id]/cover-letter?resumeId=xxx
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(_req.url);
    const resumeId = searchParams.get("resumeId");

    const coverLetter = await prisma.coverLetter.findFirst({
      where: {
        jobId: params.id,
        ...(resumeId ? { resumeId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    if (!coverLetter) {
      return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
    }

    return NextResponse.json(coverLetter);
  } catch (err) {
    console.error("[GET /api/jobs/[id]/cover-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/jobs/[id]/cover-letter
// Body: { resumeId: string, tone?: "professional" | "conversational" | "enthusiastic" }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { resumeId, tone = "professional" } = body as {
      resumeId: string;
      tone?: "professional" | "conversational" | "enthusiastic";
    };

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }

    // Fetch job and resume in parallel
    const [job, resume] = await Promise.all([
      prisma.job.findUnique({
        where: { id: params.id },
        select: { id: true, title: true, company: true, description: true },
      }),
      prisma.resume.findUnique({
        where: { id: resumeId },
        select: { id: true, textContent: true },
      }),
    ]);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const content = await generateCoverLetter({
      resumeText: resume.textContent,
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description ?? "",
      tone,
    });

    const coverLetter = await prisma.coverLetter.upsert({
      where: { resumeId_jobId: { resumeId, jobId: params.id } },
      create: { resumeId, jobId: params.id, content, tone },
      update: { content, tone },
    });

    return NextResponse.json(coverLetter);
  } catch (err) {
    console.error("[POST /api/jobs/[id]/cover-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
