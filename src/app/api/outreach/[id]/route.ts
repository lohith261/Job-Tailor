import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.outreachEmail.findUnique({ where: { id: params.id } });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: record.id,
      companyUrl: record.companyUrl,
      companyName: record.companyName,
      companyInfo: JSON.parse(record.companyInfo),
      emailSubject: record.emailSubject,
      emailBody: record.emailBody,
      resumeId: record.resumeId,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/outreach/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.outreachEmail.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/outreach/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
