import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/members — add a person to a project
export async function POST(request) {
  const body = await request.json();
  const member = await prisma.projectMember.create({
    data: {
      projectId: body.projectId,
      personId: body.personId,
      hourlyRate: body.hourlyRate || 100,
    },
    include: { person: true, timeEntries: true },
  });
  return NextResponse.json(member, { status: 201 });
}

// DELETE /api/members?id=1
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.projectMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
