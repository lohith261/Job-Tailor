import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCoverLetter } from "@/lib/ai/cover-letter";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { searchParams } = new URL(_req.url);
    const resumeId = searchParams.get("resumeId");

    const coverLetter = await prisma.coverLetter.findFirst({
      where: {
        jobId: params.id,
        job: { userId },
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await req.json();
    const { content, tone } = body as { content: string; tone?: string };

    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const result = await prisma.coverLetter.updateMany({
      where: {
        jobId: params.id,
        resume: { userId },
      },
      data: {
        content,
        ...(tone ? { tone } : {}),
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Cover letter not found" }, { status: 404 });
    }

    const updated = await prisma.coverLetter.findFirst({
      where: { jobId: params.id, resume: { userId } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/jobs/[id]/cover-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await req.json();
    const { resumeId, tone = "professional" } = body as {
      resumeId: string;
      tone?: "professional" | "conversational" | "enthusiastic";
    };

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }

    const [job, resume] = await Promise.all([
      prisma.job.findFirst({
        where: { id: params.id, userId },
        select: { id: true, title: true, company: true, description: true },
      }),
      prisma.resume.findFirst({
        where: { id: resumeId, userId },
        select: { id: true, textContent: true },
      }),
    ]);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

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
