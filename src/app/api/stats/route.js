import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/stats — aggregated statistics for charts
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
  });

  // Cost per project
  const costPerProject = projects.map((p) => {
    const hours = p.members.reduce(
      (sum, m) => sum + m.timeEntries.filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0),
      0
    );
    const cost = p.members.reduce(
      (sum, m) =>
        sum + m.timeEntries.filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0) * m.hourlyRate,
      0
    );
    return { name: p.name, kosten: cost, uren: hours };
  });

  // Hours per week
  const weekMap = {};
  const planningMap = {};
  projects.forEach((p) => {
    p.members.forEach((m) => {
      m.timeEntries.forEach((t) => {
        const map = t.type === "Realisatie" ? weekMap : planningMap;
        map[t.weekNumber] = (map[t.weekNumber] || 0) + t.hours;
      });
    });
  });
  const allWeeks = [...new Set([...Object.keys(weekMap), ...Object.keys(planningMap)])]
    .map(Number)
    .sort((a, b) => a - b);
  const hoursPerWeek = allWeeks.map((w) => ({
    week: `Wk ${w}`,
    Realisatie: weekMap[w] || 0,
    Planning: planningMap[w] || 0,
  }));

  // Hours per person
  const personMap = {};
  projects.forEach((p) => {
    p.members.forEach((m) => {
      const hrs = m.timeEntries.filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0);
      personMap[m.person.name] = (personMap[m.person.name] || 0) + hrs;
    });
  });
  const hoursPerPerson = Object.entries(personMap).map(([name, hours]) => ({ name, hours }));

  // Sprint budget overview per project (uses AFAS data + budgetAmount from sprintStartDates)
  const sprintOverview = projects
    .map((p) => {
      const sprintLengthWeeks = p.sprintLengthWeeks || 2;
      const numConfigured = p.budgetWeeks > 0 ? Math.ceil(p.budgetWeeks / sprintLengthWeeks) : 0;
      const overrides = JSON.parse(p.sprintStartDates || "[]");

      const afasSprintNums = [
        ...new Set(
          p.members.flatMap((m) =>
            m.timeEntries.filter((t) => t.type === "AFAS").map((t) => t.weekNumber)
          )
        ),
      ];
      const maxSprint = Math.max(numConfigured, ...afasSprintNums, 0);
      if (maxSprint === 0) return null;

      const sprints = Array.from({ length: maxSprint }, (_, i) => i + 1).map((s) => {
        const cost = p.members.reduce((sum, m) => {
          const entry = m.timeEntries.find((t) => t.weekNumber === s && t.type === "AFAS");
          return sum + (entry ? entry.hours * m.hourlyRate : 0);
        }, 0);
        const ovr = overrides.find((o) => o.sprint === s);
        return { sprint: s, cost, budget: ovr?.budgetAmount ?? null };
      });

      const hasAny = sprints.some((s) => s.cost > 0 || s.budget != null);
      if (!hasAny) return null;

      return { id: p.id, name: p.name, totalBudget: p.budget, sprints };
    })
    .filter(Boolean);

  // Totals
  const totalHours = Object.values(weekMap).reduce((s, v) => s + v, 0);
  const totalCost = costPerProject.reduce((s, p) => s + p.kosten, 0);

  return NextResponse.json({
    costPerProject,
    hoursPerWeek,
    hoursPerPerson,
    sprintOverview,
    totalHours,
    totalCost,
    projectCount: projects.length,
    peopleCount: new Set(projects.flatMap((p) => p.members.map((m) => m.person.id))).size,
  });
}
