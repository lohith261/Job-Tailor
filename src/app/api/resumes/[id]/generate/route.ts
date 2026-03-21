import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTailoredResume } from "@/lib/ai/resume-generator";
import { buildLatex } from "@/lib/latex/template";
import { fromJsonArray } from "@/lib/json-arrays";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const [resume, job] = await Promise.all([
      prisma.resume.findFirst({ where: { id: params.id, userId } }),
      prisma.job.findFirst({ where: { id: jobId, userId } }),
    ]);

    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const profile = await prisma.userProfile.findUnique({ where: { userId } });

    const resumeData = await generateTailoredResume({
      resumeText: resume.textContent,
      jobTitle: job.title,
      jobDescription: job.description ?? "",
      jobTags: fromJsonArray(job.tags),
      jobCompany: job.company,
    });

    if (profile) {
      if (profile.name) resumeData.contact.name = profile.name;
      if (profile.email) resumeData.contact.email = profile.email;
      if (profile.phone) resumeData.contact.phone = profile.phone;
      if (profile.linkedin) resumeData.contact.linkedin = profile.linkedin;
      if (profile.github) resumeData.contact.github = profile.github;
      if (profile.location) resumeData.contact.location = profile.location;
    }

    const latexSource = buildLatex(resumeData);

    const saved = await prisma.tailoredResume.upsert({
      where: { resumeId_jobId: { resumeId: params.id, jobId } },
      create: {
        resumeId: params.id,
        jobId,
        latexSource,
        resumeJson: JSON.stringify(resumeData),
        projectedScore: resumeData.projectedScore,
      },
      update: {
        latexSource,
        resumeJson: JSON.stringify(resumeData),
        projectedScore: resumeData.projectedScore,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: saved.id,
      resumeId: saved.resumeId,
      jobId: saved.jobId,
      projectedScore: saved.projectedScore,
      latexSource: saved.latexSource,
      resumeData,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
      job: { id: job.id, title: job.title, company: job.company },
    });
  } catch (err) {
    console.error("POST /api/resumes/[id]/generate error:", err);
    return NextResponse.json({ error: "Resume generation failed" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { searchParams } = new URL(_req.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

    const tailored = await prisma.tailoredResume.findFirst({
      where: { resumeId: params.id, jobId, resume: { userId } },
      include: { job: { select: { id: true, title: true, company: true } } },
    });

    if (!tailored) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    });
  } catch (err) {
    console.error("GET /api/resumes/[id]/generate error:", err);
    return NextResponse.json({ error: "Failed to fetch tailored resume" }, { status: 500 });
  }
}
