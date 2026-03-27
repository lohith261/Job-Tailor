import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";

// RFC 5322-inspired email format check (no library dependency)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkAuthRateLimit(getClientIp(req));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
      );
    }

    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(String(email))) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      // Generic message — avoids leaking which emails are registered (user enumeration)
      return NextResponse.json({ error: "Unable to create account with these details" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const devMode = !process.env.RESEND_API_KEY;

    if (devMode) {
      // Dev mode: skip email verification, auto-verify
      const user = await prisma.user.create({
        data: { email: email.toLowerCase(), passwordHash, name: name || "", emailVerified: true },
      });
      return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
    }

    // Production: generate verify token and send email
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || "",
        emailVerified: false,
        verifyToken,
        verifyTokenExpiry,
      },
    });

    // Send verification email — best effort (signup still succeeds if email fails)
    try {
      await sendVerificationEmail(user.email, verifyToken);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
