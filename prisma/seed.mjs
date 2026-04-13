import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const adapter = new PrismaNeonHTTP(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  // People
  const sjoerd = await prisma.person.create({ data: { name: "Sjoerd Reen", role: "Tech Lead" } });
  const lisa = await prisma.person.create({ data: { name: "Lisa de Vries", role: "Designer" } });
  const mark = await prisma.person.create({ data: { name: "Mark Jansen", role: "Developer" } });
  const anna = await prisma.person.create({ data: { name: "Anna Bakker", role: "Project Manager" } });

  // Projects
  const website = await prisma.project.create({
    data: { name: "Website Redesign", description: "Volledige herontwerp van de bedrijfswebsite", startDate: "2026-01-06" },
  });
  const app = await prisma.project.create({
    data: { name: "Mobile App v2", description: "Nieuwe versie van de mobiele applicatie", startDate: "2026-02-10" },
  });

  // Project Members
  const m1 = await prisma.projectMember.create({ data: { projectId: website.id, personId: sjoerd.id, hourlyRate: 125 } });
  const m2 = await prisma.projectMember.create({ data: { projectId: website.id, personId: lisa.id, hourlyRate: 110 } });
  const m3 = await prisma.projectMember.create({ data: { projectId: website.id, personId: mark.id, hourlyRate: 95 } });
  const m4 = await prisma.projectMember.create({ data: { projectId: app.id, personId: sjoerd.id, hourlyRate: 130 } });
  const m5 = await prisma.projectMember.create({ data: { projectId: app.id, personId: anna.id, hourlyRate: 115 } });

  // Time Entries - Realisatie
  const realisatie = [
    { projectMemberId: m1.id, weekNumber: 2, hours: 32 },
    { projectMemberId: m1.id, weekNumber: 3, hours: 40 },
    { projectMemberId: m1.id, weekNumber: 4, hours: 36 },
    { projectMemberId: m2.id, weekNumber: 2, hours: 24 },
    { projectMemberId: m2.id, weekNumber: 3, hours: 20 },
    { projectMemberId: m2.id, weekNumber: 4, hours: 28 },
    { projectMemberId: m3.id, weekNumber: 3, hours: 40 },
    { projectMemberId: m3.id, weekNumber: 4, hours: 40 },
    { projectMemberId: m4.id, weekNumber: 7, hours: 20 },
    { projectMemberId: m4.id, weekNumber: 8, hours: 35 },
    { projectMemberId: m5.id, weekNumber: 7, hours: 16 },
    { projectMemberId: m5.id, weekNumber: 8, hours: 24 },
  ];

  for (const entry of realisatie) {
    await prisma.timeEntry.create({ data: { ...entry, type: "Realisatie" } });
  }

  // Time Entries - Planning
  const planning = [
    { projectMemberId: m1.id, weekNumber: 2, hours: 30 },
    { projectMemberId: m1.id, weekNumber: 3, hours: 40 },
    { projectMemberId: m2.id, weekNumber: 2, hours: 20 },
    { projectMemberId: m2.id, weekNumber: 3, hours: 24 },
  ];

  for (const entry of planning) {
    await prisma.timeEntry.create({ data: { ...entry, type: "Planning" } });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
