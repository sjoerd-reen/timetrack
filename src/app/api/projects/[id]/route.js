import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";

const include = {
  members: {
    include: {
      person: true,
      timeEntries: { orderBy: { weekNumber: "asc" } },
    },
  },
};

// GET /api/projects/:idOrSlug — get project by numeric id or name-slug
export async function GET(request, { params }) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  let project;

  if (!isNaN(numId)) {
    project = await prisma.project.findUnique({ where: { id: numId }, include });
  } else {
    const all = await prisma.project.findMany({ include });
    project = all.find((p) => slugify(p.name) === id) ?? null;
  }

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
