import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePdf } from "@/lib/parsers/pdf";
import { parseDocx } from "@/lib/parsers/docx";
import { parseTxt } from "@/lib/parsers/txt";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { analyses: true } },
      },
    });
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    let analysesByResume = new Map<string, {
      jobId: string;
      matchScore: number;
      missingKeywordsCount: number;
      presentKeywordsCount: number;
      createdAt: string;
    }>();

    if (jobId) {
      const analyses = await prisma.resumeAnalysis.findMany({
        where: { jobId, resume: { userId } },
        select: {
          resumeId: true,
          jobId: true,
          matchScore: true,
          missingKeywords: true,
          presentKeywords: true,
          createdAt: true,
        },
      });
      analysesByResume = new Map(
        analyses.map((a) => [
          a.resumeId,
          {
            jobId: a.jobId,
            matchScore: a.matchScore,
            missingKeywordsCount: parseJsonArrayCount(a.missingKeywords),
            presentKeywordsCount: parseJsonArrayCount(a.presentKeywords),
            createdAt: a.createdAt.toISOString(),
          },
        ])
      );
    }

    const data = resumes.map((r) => {
      const rawText = (r.textContent ?? "").slice(0, 200);
      const lines = rawText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .slice(0, 3);
      const textPreview = lines.join(" · ") || undefined;

      return {
        id: r.id,
        name: r.name,
        fileName: r.fileName,
        format: r.format,
        isPrimary: r.isPrimary,
        wordCount: r.wordCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        analysisCount: r._count.analyses,
        jobAnalysis: analysesByResume.get(r.id) ?? null,
        textPreview,
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/resumes error:", err);
    return NextResponse.json({ error: "Failed to fetch resumes" }, { status: 500 });
  }
}

function parseJsonArrayCount(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const contentType = req.headers.get("content-type") ?? "";

    // --- Plain-text paste path ---
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawText: string = typeof body.text === "string" ? body.text : "";
      const name: string = typeof body.name === "string" ? body.name.trim() : "";

      if (rawText.trim().length < 50) {
        return NextResponse.json(
          { error: "Resume text is too short. Please paste at least 50 characters." },
          { status: 422 }
        );
      }

      if (!name) {
        return NextResponse.json({ error: "Resume name is required." }, { status: 400 });
      }

      const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;

      const resume = await prisma.resume.create({
        data: {
          userId,
          name,
          fileName: `${name}.txt`,
          textContent: rawText,
          format: "txt",
          wordCount,
          isPrimary: false,
        },
      });

      return NextResponse.json({
        id: resume.id,
        name: resume.name,
        fileName: resume.fileName,
        format: resume.format,
        isPrimary: resume.isPrimary,
        wordCount: resume.wordCount,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
        analysisCount: 0,
      });
    }

    // --- File upload path ---
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 5 MB." },
        { status: 413 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "docx", "txt"].includes(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";
    let wordCount = 0;

    if (ext === "pdf") {
      const result = await parsePdf(buffer);
      text = result.text;
      wordCount = result.wordCount;
    } else if (ext === "docx") {
      const result = await parseDocx(buffer);
      text = result.text;
      wordCount = result.wordCount;
    } else {
      const result = parseTxt(buffer);
      text = result.text;
      wordCount = result.wordCount;
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract meaningful text from this file. Try a different format." },
        { status: 422 }
      );
    }

    const resumeName = name.trim() || file.name.replace(/\.[^.]+$/, "");

    const resume = await prisma.resume.create({
      data: {
        userId,
        name: resumeName,
        fileName: file.name,
        textContent: text,
        format: ext,
        wordCount,
        isPrimary: false,
      },
    });

    return NextResponse.json({
      id: resume.id,
      name: resume.name,
      fileName: resume.fileName,
      format: resume.format,
      isPrimary: resume.isPrimary,
      wordCount: resume.wordCount,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      analysisCount: 0,
    });
  } catch (err) {
    console.error("POST /api/resumes error:", err);
    return NextResponse.json({ error: "Failed to upload resume" }, { status: 500 });
  }
}
