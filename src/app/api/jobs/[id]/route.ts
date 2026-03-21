import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeJob } from "@/lib/json-arrays";
import { getActiveSearchConfig } from "@/lib/search-config";
import { getRequiredUserId } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  const job = await prisma.job.findFirst({
    where: { id: params.id, userId },
    include: { companyInfo: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const searchConfig = await getActiveSearchConfig(userId);
  return NextResponse.json(
    serializeJob(job as unknown as Record<string, unknown>, searchConfig)
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getRequiredUserId();
  if ("error" in auth) return auth.error;
  const { userId } = auth;

  const body = await req.json();
  const { status } = body;

  const validStatuses = ["new", "saved", "applied", "archived", "dismissed"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const result = await prisma.job.updateMany({
    where: { id: params.id, userId },
    data: { ...(status && { status }) },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
