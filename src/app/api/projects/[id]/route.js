import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/projects/:id — get project with all members and time entries
export async function GET(request, { params }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id: parseInt(id) },
    include: {
      members: {
        include: {
          person: true,
          timeEntries: {
            orderBy: { weekNumber: "asc" },
          },
        },
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
