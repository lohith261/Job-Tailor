import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeJob } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: { companyInfo: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const searchConfig = await getActiveSearchConfig();

  return NextResponse.json(
    serializeJob(job as unknown as Record<string, unknown>, searchConfig)
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { status } = body;

  const validStatuses = ["new", "saved", "applied", "archived", "dismissed"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const job = await prisma.job.update({
    where: { id: params.id },
    data: { ...(status && { status }) },
  });

  return NextResponse.json(job);
}
