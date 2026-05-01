import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const normalize = (s) => String(s).trim().toLowerCase();

// POST /api/projects/:id/afas
// Body: { rows: [{ naam, weekNumber, hours }] }
// Replaces all existing AFAS entries for this project, returns match results.
export async function POST(request, { params }) {
  const { id } = await params;
  const projectId = parseInt(id);
  const { rows } = await request.json();

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { person: true },
  });

  const memberByName = new Map(members.map((m) => [normalize(m.person.name), m]));

  // Group by (normalizedNaam, weekNumber) and sum hours
  const grouped = new Map();
  for (const row of rows) {
    const key = `${normalize(row.naam)}::${row.weekNumber}`;
    const existing = grouped.get(key) ?? { naam: row.naam, weekNumber: row.weekNumber, hours: 0 };
    existing.hours += row.hours;
    grouped.set(key, existing);
  }

  const matched = new Set();
  const unmatched = new Set();
  const toCreate = [];

  for (const entry of grouped.values()) {
    const member = memberByName.get(normalize(entry.naam));
    if (member) {
      matched.add(entry.naam);
      toCreate.push({
        projectMemberId: member.id,
        weekNumber: entry.weekNumber,
        hours: entry.hours,
        type: "AFAS",
      });
    } else {
      unmatched.add(entry.naam);
    }
  }

  // Full replacement: delete all existing AFAS entries for this project
  await prisma.timeEntry.deleteMany({
    where: { projectMember: { projectId }, type: "AFAS" },
  });

  if (toCreate.length > 0) {
    await prisma.timeEntry.createMany({ data: toCreate });
  }

  return NextResponse.json({
    matched: [...matched],
    unmatched: [...unmatched],
    created: toCreate.length,
  });
}

// DELETE /api/projects/:id/afas — wipe all AFAS entries
export async function DELETE(request, { params }) {
  const { id } = await params;
  const projectId = parseInt(id);

  const { count } = await prisma.timeEntry.deleteMany({
    where: { projectMember: { projectId }, type: "AFAS" },
  });

  return NextResponse.json({ deleted: count });
}
