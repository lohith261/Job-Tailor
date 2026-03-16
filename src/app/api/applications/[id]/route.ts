import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTimeline } from "@/lib/json-arrays";
import { randomUUID } from "crypto";
import type { TimelineEvent } from "@/types";
import { JOB_SELECT, serializeApplication } from "@/lib/serialize-application";
import { formatDateLabel, getSuggestedFollowUpDate } from "@/lib/follow-up";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const app = await prisma.application.findUnique({
      where: { id: params.id },
      include: { job: { select: JOB_SELECT } },
    });

    if (!app) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      serializeApplication(app as unknown as Record<string, unknown>)
    );
  } catch (err) {
    console.error("GET /api/applications/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, confirmedApplied = false, appliedAt, followUpDate, ...rest } = body;

    const app = await prisma.application.findUnique({
      where: { id: params.id },
    });
    if (!app) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Approval gate
    if (status === "applied" && !confirmedApplied) {
      return NextResponse.json(
        { error: "Applied status requires confirmedApplied: true" },
        { status: 400 }
      );
    }

    // Build timeline update if status is changing
    let updatedTimeline = parseTimeline(app.timeline);
    if (status && status !== app.status) {
      const labels: Record<string, string> = {
        bookmarked: "Bookmarked",
        applied: "Applied",
        interview: "Interview",
        offer: "Offer",
        rejected: "Rejected",
      };
      const event: TimelineEvent = {
        id: randomUUID(),
        type: "status_change",
        description: `Moved to ${labels[status] ?? status}`,
        timestamp: new Date().toISOString(),
      };
      updatedTimeline = [...updatedTimeline, event];
    }

    const effectiveAppliedAt =
      appliedAt !== undefined
        ? appliedAt
          ? new Date(appliedAt)
          : null
        : app.appliedAt;

    let effectiveFollowUpDate =
      followUpDate !== undefined
        ? followUpDate
          ? new Date(followUpDate)
          : null
        : app.followUpDate;

    if (
      status === "applied" &&
      (followUpDate === undefined || followUpDate === null) &&
      !app.followUpDate
    ) {
      effectiveFollowUpDate = getSuggestedFollowUpDate(effectiveAppliedAt);
    }

    const priorFollowUpIso = app.followUpDate ? app.followUpDate.toISOString().slice(0, 10) : null;
    const nextFollowUpIso = effectiveFollowUpDate
      ? effectiveFollowUpDate.toISOString().slice(0, 10)
      : null;

    if (priorFollowUpIso !== nextFollowUpIso) {
      const description = effectiveFollowUpDate
        ? `Follow-up scheduled for ${formatDateLabel(effectiveFollowUpDate)}`
        : "Follow-up reminder cleared";
      updatedTimeline = [
        ...updatedTimeline,
        {
          id: randomUUID(),
          type: "follow_up_set",
          description,
          timestamp: new Date().toISOString(),
        },
      ];
    }

    const recruiterFields = [
      { key: "recruiterName", label: "name" },
      { key: "recruiterEmail", label: "email" },
      { key: "recruiterLinkedIn", label: "LinkedIn" },
    ] as const;
    const recruiterChanges = recruiterFields
      .filter(({ key }) => key in rest && String(rest[key] ?? "") !== String(app[key] ?? ""))
      .map(({ label, key }) =>
        String(rest[key] ?? "").trim()
          ? `Recruiter ${label} updated`
          : `Recruiter ${label} cleared`
      );

    if (recruiterChanges.length > 0) {
      updatedTimeline = [
        ...updatedTimeline,
        ...recruiterChanges.map((description) => ({
          id: randomUUID(),
          type: "recruiter_added" as const,
          description,
          timestamp: new Date().toISOString(),
        })),
      ];
    }

    const updateData: Record<string, unknown> = {
      ...rest,
      timeline: JSON.stringify(updatedTimeline),
    };
    if (status) updateData.status = status;
    if (appliedAt !== undefined || (status === "applied" && !app.appliedAt)) {
      updateData.appliedAt = effectiveAppliedAt;
    }
    if (followUpDate !== undefined || (status === "applied" && !app.followUpDate)) {
      updateData.followUpDate = effectiveFollowUpDate;
    }

    const updated = await prisma.application.update({
      where: { id: params.id },
      data: updateData,
      include: { job: { select: JOB_SELECT } },
    });

    return NextResponse.json(
      serializeApplication(updated as unknown as Record<string, unknown>)
    );
  } catch (err) {
    console.error("PATCH /api/applications/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.application.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/applications/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
