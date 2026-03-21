import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parsePdf } from "@/lib/parsers/pdf";
import { getRequiredUserId } from "@/lib/auth-helpers";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function GET() {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    return NextResponse.json(profile ?? { userId, name: "", email: "", phone: "", linkedin: "", github: "", location: "" });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const body = await req.json();
    const { name = "", email = "", phone = "", linkedin = "", github = "", location = "" } = body;

    // Validate email format if provided — it's used in generated resume documents
    if (email && !EMAIL_REGEX.test(String(email))) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, name, email, phone, linkedin, github, location },
      update: { name, email, phone, linkedin, github, location },
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 5 MB." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text } = await parsePdf(buffer);

    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(\+?[\d][\d\s\-().]{8,}[\d])/);
    const linkedinMatch = text.match(/(?:linkedin\.com\/in\/)([\w-]+)/i);
    const githubMatch = text.match(/(?:github\.com\/)([\w-]+)/i);

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const nameLine = lines.find((l) => /^[A-Z][a-zA-Z .'"'"'-]{2,50}$/.test(l) && l.split(" ").length >= 2 && l.split(" ").length <= 5);
    const locationMatch = text.match(/\b([A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)\b/);

    return NextResponse.json({
      name: nameLine ?? "",
      email: emailMatch?.[0] ?? "",
      phone: phoneMatch?.[0]?.trim() ?? "",
      linkedin: linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : "",
      github: githubMatch ? `github.com/${githubMatch[1]}` : "",
      location: locationMatch?.[1] ?? "",
    });
  } catch (err) {
    console.error("POST /api/profile (extract) error:", err);
    return NextResponse.json({ error: "Failed to extract from resume" }, { status: 500 });
  }
}
