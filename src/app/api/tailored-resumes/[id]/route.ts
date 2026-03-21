import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tailored = await prisma.tailoredResume.findUnique({
      where: { id: params.id },
      include: {
        job: { select: { id: true, title: true, company: true } },
        resume: { select: { id: true, name: true } },
      },
    });

    if (!tailored) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: tailored.id,
      resumeId: tailored.resumeId,
      jobId: tailored.jobId,
      projectedScore: tailored.projectedScore,
      latexSource: tailored.latexSource,
      resumeData: JSON.parse(tailored.resumeJson),
      createdAt: tailored.createdAt.toISOString(),
      updatedAt: tailored.updatedAt.toISOString(),
      job: tailored.job,
      resume: tailored.resume,
    });
  } catch (err) {
    console.error("GET /api/tailored-resumes/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tailoredResume.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tailored-resumes/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
