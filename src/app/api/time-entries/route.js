import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT /api/time-entries — upsert a time entry (create or update)
export async function PUT(request) {
  const body = await request.json();
  const { projectMemberId, weekNumber, hours, type } = body;

  if (hours === 0 || hours === null) {
    // Delete entry if hours is 0
    await prisma.timeEntry.deleteMany({
      where: { projectMemberId, weekNumber, type },
    });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const entry = await prisma.timeEntry.upsert({
    where: {
      projectMemberId_weekNumber_type: { projectMemberId, weekNumber, type },
    },
    update: { hours },
    create: { projectMemberId, weekNumber, hours, type },
  });

  return NextResponse.json(entry);
}

// GET /api/time-entries — get all time entries (for stats)
export async function GET() {
  const entries = await prisma.timeEntry.findMany({
    include: {
      projectMember: {
        include: {
          person: true,
          project: true,
        },
      },
    },
  });
  return NextResponse.json(entries);
}
