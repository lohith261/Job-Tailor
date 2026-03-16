import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import type { TimelineEvent } from "@/types";
import { JOB_SELECT, serializeApplication } from "@/lib/serialize-application";
import { formatDateLabel, getSuggestedFollowUpDate } from "@/lib/follow-up";

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { updatedAt: "desc" },
      include: { job: { select: JOB_SELECT } },
    });

    return NextResponse.json(applications.map(serializeApplication));
  } catch (err) {
    console.error("GET /api/applications error:", err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status = "bookmarked", confirmedApplied = false } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    // Approval gate: "applied" requires explicit confirmation
    if (status === "applied" && !confirmedApplied) {
      return NextResponse.json(
        { error: "Applied status requires confirmedApplied: true" },
        { status: 400 }
      );
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if application already exists
    const existing = await prisma.application.findUnique({ where: { jobId } });
    if (existing) {
      return NextResponse.json(
        { error: "Application already exists for this job", id: existing.id },
        { status: 409 }
      );
    }

    const initialEvent: TimelineEvent = {
      id: randomUUID(),
      type: "status_change",
      description: `Added to ${status === "bookmarked" ? "Bookmarked" : status} stage`,
      timestamp: new Date().toISOString(),
    };

    const appliedAt =
      status === "applied" && body.appliedAt
        ? new Date(body.appliedAt)
        : status === "applied"
        ? new Date()
        : null;

    const followUpDate =
      status === "applied"
        ? body.followUpDate
          ? new Date(body.followUpDate)
          : getSuggestedFollowUpDate(appliedAt)
        : null;

    const timeline = [initialEvent];
    if (followUpDate) {
      timeline.push({
        id: randomUUID(),
        type: "follow_up_set",
        description: `Follow-up scheduled for ${formatDateLabel(followUpDate)}`,
        timestamp: new Date().toISOString(),
      });
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        status,
        timeline: JSON.stringify(timeline),
        appliedAt,
        followUpDate,
      },
      include: { job: { select: JOB_SELECT } },
    });

    return NextResponse.json(
      serializeApplication(application as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/applications error:", err);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
