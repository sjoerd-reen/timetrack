import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/people
export async function GET() {
  const people = await prisma.person.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { project: true },
      },
    },
  });
  return NextResponse.json(people);
}

// POST /api/people
export async function POST(request) {
  const body = await request.json();
  const person = await prisma.person.create({
    data: { name: body.name, role: body.role || "Medewerker" },
  });
  return NextResponse.json(person, { status: 201 });
}

// PUT /api/people — update a person
export async function PUT(request) {
  const body = await request.json();
  const person = await prisma.person.update({
    where: { id: body.id },
    data: { name: body.name, role: body.role },
  });
  return NextResponse.json(person);
}

// DELETE /api/people?id=1
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
