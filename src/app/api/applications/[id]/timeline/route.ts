import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTimeline } from "@/lib/json-arrays";
import { randomUUID } from "crypto";
import type { TimelineEvent } from "@/types";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getRequiredUserId();
    if ("error" in auth) return auth.error;
    const { userId } = auth;

    const { description } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const app = await prisma.application.findFirst({
      where: { id: params.id, job: { userId } },
    });
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const event: TimelineEvent = {
      id: randomUUID(),
      type: "manual",
      description: description.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedTimeline = [...parseTimeline(app.timeline), event];

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: { timeline: JSON.stringify(updatedTimeline) },
    });

    return NextResponse.json({ timeline: parseTimeline(updated.timeline) });
  } catch (err) {
    console.error("POST /api/applications/[id]/timeline error:", err);
    return NextResponse.json({ error: "Failed to add timeline event" }, { status: 500 });
  }
}
