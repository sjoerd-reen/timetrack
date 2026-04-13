import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/projects — list all projects with member count and totals
export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      members: {
        include: {
          person: true,
          timeEntries: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = projects.map((p) => {
    const totalHours = p.members.reduce(
      (sum, m) => sum + m.timeEntries.filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0),
      0
    );
    const totalCost = p.members.reduce(
      (sum, m) => sum + m.timeEntries.filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0) * m.hourlyRate,
      0
    );
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      startDate: p.startDate,
      memberCount: p.members.length,
      totalHours,
      totalCost,
    };
  });

  return NextResponse.json(result);
}

// POST /api/projects — create a new project
export async function POST(request) {
  const body = await request.json();
  const project = await prisma.project.create({
    data: {
      name: body.name,
      description: body.description || "",
      startDate: body.startDate || "",
    },
  });
  return NextResponse.json(project, { status: 201 });
}

// DELETE /api/projects?id=1 — delete a project
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
