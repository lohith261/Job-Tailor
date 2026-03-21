import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fromJsonArray } from "@/lib/json-arrays";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const resume = await prisma.resume.findFirst({
      where: { id: params.id, userId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                locationType: true,
                matchScore: true,
              },
            },
          },
        },
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: resume.id,
      name: resume.name,
      fileName: resume.fileName,
      format: resume.format,
      isPrimary: resume.isPrimary,
      wordCount: resume.wordCount,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      analyses: resume.analyses.map((a) => ({
        id: a.id,
        resumeId: a.resumeId,
        jobId: a.jobId,
        matchScore: a.matchScore,
        presentKeywords: fromJsonArray(a.presentKeywords),
        missingKeywords: fromJsonArray(a.missingKeywords),
        suggestions: (() => {
          try { return JSON.parse(a.suggestions); } catch { return []; }
        })(),
        summary: a.summary,
        createdAt: a.createdAt.toISOString(),
        job: a.job,
      })),
    });
  } catch (err) {
    console.error("GET /api/resumes/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
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

    // Verify ownership before any writes
    const existing = await prisma.resume.findFirst({ where: { id: params.id, userId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Wrap the clear + update in an interactive transaction so a failed second
    // write never leaves the user without a primary resume
    const result = await prisma.$transaction(async (tx) => {
      if (body.isPrimary === true) {
        await tx.resume.updateMany({ where: { userId }, data: { isPrimary: false } });
      }
      return tx.resume.updateMany({
        where: { id: params.id, userId },
        data: {
          ...(body.name !== undefined && { name: String(body.name).slice(0, 255) }),
          ...(body.isPrimary !== undefined && { isPrimary: Boolean(body.isPrimary) }),
        },
      });
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resume = await prisma.resume.findUnique({ where: { id: params.id } });
    return NextResponse.json({ id: resume!.id, name: resume!.name, isPrimary: resume!.isPrimary });
  } catch (err) {
    console.error("PATCH /api/resumes/[id] error:", err);
    return NextResponse.json({ error: "Failed to update resume" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const result = await prisma.resume.deleteMany({ where: { id: params.id, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/resumes/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete resume" }, { status: 500 });
  }
}
