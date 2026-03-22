import { NextResponse } from "next/server";
import { getRequiredUserId } from "@/lib/auth-helpers";
import { requestCancellation } from "@/lib/pipeline-cancel";

export async function POST() {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    requestCancellation(userId);
    return NextResponse.json({ cancelled: true });
  } catch (err) {
    console.error("[POST /api/pipeline/cancel]", err);
    return NextResponse.json({ error: "Failed to cancel pipeline." }, { status: 500 });
  }
}
