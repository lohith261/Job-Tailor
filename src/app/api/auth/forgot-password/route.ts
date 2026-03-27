import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkAuthRateLimit(getClientIp(req));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
      );
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } },
    });

    // Always return the same response to avoid leaking whether an email is registered
    if (!user) {
      return NextResponse.json({
        message: "If that email is registered, you will receive a reset link shortly.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const devMode = !process.env.RESEND_API_KEY;
    if (devMode) {
      // Dev-only: log the reset URL to the server console so developers can test
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      console.log(`[DEV] Password reset URL: ${baseUrl}/reset-password?token=${token}`);
    } else {
      // Production: email the reset link; never expose the token in the API response
      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (emailErr) {
        console.error("Failed to send password reset email:", emailErr);
      }
    }

    return NextResponse.json({
      message: "If that email is registered, you will receive a reset link shortly.",
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
