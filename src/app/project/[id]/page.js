"use client";

import { useState, useEffect, useRef, useCallback, use, Fragment } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, BackIcon, TrashIcon } from "@/components/Icons";
import { fetchProject, fetchPeople, createPerson, addMember, removeMember, upsertTimeEntry, updateProject, importAfas, deleteAfas } from "@/lib/api";
import { fmtEur } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, ReferenceLine,
} from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

// ─── Icons ───────────────────────────────────────────────────
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
  </svg>
);
const TableIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
  </svg>
);
const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

// ═══════════════════════════════════════════════════════════════
// SPRINT HELPER
// ═══════════════════════════════════════════════════════════════
function getSprintForWeek(week, startWeek, sprintLength) {
  return Math.ceil((week - startWeek + 1) / sprintLength);
}

function getSprintRanges(weeks, startWeek, sprintLength) {
  const sprints = [];
  let currentSprint = null;
  weeks.forEach((w, idx) => {
    const sNum = getSprintForWeek(w, startWeek, sprintLength);
    if (!currentSprint || currentSprint.sprint !== sNum) {
      if (currentSprint) currentSprint.colSpan = idx - currentSprint.startIdx;
      currentSprint = { sprint: sNum, startIdx: idx, colSpan: 1 };
      sprints.push(currentSprint);
    }
  });
  if (currentSprint) currentSprint.colSpan = weeks.length - currentSprint.startIdx;
  return sprints;
}

// ═══════════════════════════════════════════════════════════════
// BUDGET PROGRESS COMPONENT
// ═══════════════════════════════════════════════════════════════
function BudgetProgress({ project, members }) {
  const budget = project.budget || 0;
  const budgetWeeks = project.budgetWeeks || 0;

  // Calculate current spend
  const totalSpend = members.reduce((sum, m) =>
    sum + (m.timeEntries || [])
      .filter((t) => t.type === "Realisatie")
      .reduce((s, t) => s + t.hours * m.hourlyRate, 0),
  0);

  // Calculate elapsed weeks from startDate
  let elapsedWeeks = 0;
  if (project.startDate) {
    const start = new Date(project.startDate);
    const now = new Date();
    const diffMs = now - start;
    elapsedWeeks = Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }

  const timePercentage = budgetWeeks > 0 ? (elapsedWeeks / budgetWeeks) * 100 : 0;
  const budgetPercentage = budget > 0 ? (totalSpend / budget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;
  const isOverTime = timePercentage > 100;
  const isAheadOfSchedule = budgetPercentage > timePercentage;

  if (budget === 0 && budgetWeeks === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-6 animate-fade-in-up delay-150">
      <h2 className="font-semibold text-gray-900 mb-4">Budgetoverzicht</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Totaal Budget</div>
          <div className="text-xl font-bold text-gray-900">{fmtEur(budget)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Besteed</div>
          <div className={`text-xl font-bold ${isOverBudget ? "text-red-600" : "text-emerald-600"}`}>{fmtEur(totalSpend)}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Resterend</div>
          <div className={`text-xl font-bold ${budget - totalSpend < 0 ? "text-red-600" : "text-gray-900"}`}>{fmtEur(Math.max(budget - totalSpend, 0))}</div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Looptijd</div>
          <div className={`text-xl font-bold ${isOverTime ? "text-red-600" : "text-gray-900"}`}>Wk {elapsedWeeks} / {budgetWeeks}</div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Budget verbruik</span>
            <span className={`font-semibold ${isOverBudget ? "text-red-600" : "text-gray-700"}`}>{budgetPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-indigo-500"}`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Tijd verstreken</span>
            <span className="font-semibold text-gray-700">{timePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(timePercentage, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {budget > 0 && budgetWeeks > 0 && (
        <div className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-medium ${
          isOverBudget ? "bg-red-50 text-red-700" :
          isAheadOfSchedule ? "bg-amber-50 text-amber-700" :
          "bg-emerald-50 text-emerald-700"
        }`}>
          {isOverBudget ? "Budget overschreden" :
           isAheadOfSchedule ? `Budget verbruik (${budgetPercentage.toFixed(0)}%) loopt voor op de tijd (${timePercentage.toFixed(0)}%)` :
           `Op schema — ${budgetPercentage.toFixed(0)}% budget bij ${timePercentage.toFixed(0)}% van de tijd`}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT STATISTICS VIEW
// ═══════════════════════════════════════════════════════════════
function ProjectStats({ project, members }) {
  const sprintLen = project.sprintLengthWeeks || 2;

  // Gather all weeks
  const allWeeks = [...new Set(members.flatMap((m) => (m.timeEntries || []).map((t) => t.weekNumber)))].sort((a, b) => a - b);
  const startWeek = allWeeks.length > 0 ? allWeeks[0] : 1;

  // ── Sprint data: planning vs realisatie per sprint ──
  const sprintMap = {};
  members.forEach((m) => {
    (m.timeEntries || []).forEach((t) => {
      const s = getSprintForWeek(t.weekNumber, startWeek, sprintLen);
      const key = `Sprint ${s}`;
      if (!sprintMap[key]) sprintMap[key] = { sprint: key, Planning: 0, Realisatie: 0, PlanningKosten: 0, RealisatieKosten: 0 };
      sprintMap[key][t.type] += t.hours;
      sprintMap[key][`${t.type}Kosten`] += t.hours * m.hourlyRate;
    });
  });
  const sprintData = Object.values(sprintMap).sort((a, b) => {
    const numA = parseInt(a.sprint.replace("Sprint ", ""));
    const numB = parseInt(b.sprint.replace("Sprint ", ""));
    return numA - numB;
  });

  // ── Cumulative budget burn ──
  const budget = project.budget || 0;
  let cumCost = 0;
  const burnData = sprintData.map((s) => {
    cumCost += s.RealisatieKosten;
    return { sprint: s.sprint, Besteed: cumCost, Budget: budget };
  });

  // ── Hours per person ──
  const personMap = {};
  members.forEach((m) => {
    const hrs = (m.timeEntries || []).filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0);
    const cost = hrs * m.hourlyRate;
    personMap[m.person.name] = { name: m.person.name, hours: hrs, kosten: cost, role: m.person.role };
  });
  const personData = Object.values(personMap).sort((a, b) => b.hours - a.hours);

  // ── Velocity per sprint (total realized hours) ──
  const velocityData = sprintData.map((s) => ({
    sprint: s.sprint,
    Uren: s.Realisatie,
  }));
  const avgVelocity = velocityData.length > 0 ? velocityData.reduce((s, v) => s + v.Uren, 0) / velocityData.length : 0;

  // ── Planning accuracy per sprint ──
  const accuracyData = sprintData
    .filter((s) => s.Planning > 0)
    .map((s) => ({
      sprint: s.sprint,
      Nauwkeurigheid: Math.round((s.Realisatie / s.Planning) * 100),
    }));

  // ── KPIs ──
  const totalRealisatie = members.reduce((sum, m) =>
    sum + (m.timeEntries || []).filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours, 0), 0);
  const totalPlanning = members.reduce((sum, m) =>
    sum + (m.timeEntries || []).filter((t) => t.type === "Planning").reduce((s, t) => s + t.hours, 0), 0);
  const totalCost = members.reduce((sum, m) =>
    sum + (m.timeEntries || []).filter((t) => t.type === "Realisatie").reduce((s, t) => s + t.hours * m.hourlyRate, 0), 0);
  const planningAccuracy = totalPlanning > 0 ? ((totalRealisatie / totalPlanning) * 100).toFixed(0) : "—";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Gerealiseerde Uren", value: `${totalRealisatie}u`, color: "text-indigo-600" },
          { label: "Geplande Uren", value: `${totalPlanning}u`, color: "text-amber-600" },
          { label: "Totale Kosten", value: fmtEur(totalCost), color: "text-emerald-600" },
          { label: "Planning Accuracy", value: `${planningAccuracy}%`, color: totalRealisatie > totalPlanning ? "text-red-600" : "text-emerald-600" },
          { label: "Gem. Velocity/Sprint", value: `${avgVelocity.toFixed(0)}u`, color: "text-purple-600" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 55}ms` }}>
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Burn Chart */}
        {budget > 0 && burnData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "75ms" }}>
            <h3 className="font-semibold text-gray-900 mb-1">Budget Burn-down</h3>
            <p className="text-xs text-gray-400 mb-4">Cumulatieve kosten vs. totaalbudget per sprint</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={burnData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmtEur(v)} />
                <Legend />
                <Line type="monotone" dataKey="Besteed" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Besteed" />
                <ReferenceLine y={budget} stroke="#ef4444" strokeDasharray="8 4" strokeWidth={2} label={{ value: "Budget", fill: "#ef4444", fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Planning vs Realisatie per Sprint */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
          <h3 className="font-semibold text-gray-900 mb-1">Planning vs. Realisatie per Sprint</h3>
          <p className="text-xs text-gray-400 mb-4">Vergelijk geplande uren met daadwerkelijk gerealiseerde uren</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sprintData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Planning" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realisatie" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "185ms" }}>
          <h3 className="font-semibold text-gray-900 mb-1">Velocity per Sprint</h3>
          <p className="text-xs text-gray-400 mb-4">Totaal gerealiseerde uren per sprint met gemiddelde</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Uren" fill="#10b981" radius={[6, 6, 0, 0]} />
              {avgVelocity > 0 && (
                <ReferenceLine y={avgVelocity} stroke="#6366f1" strokeDasharray="6 3" strokeWidth={2}
                  label={{ value: `Gem: ${avgVelocity.toFixed(0)}u`, fill: "#6366f1", fontSize: 11 }} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost per Person */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-gray-900 mb-1">Uren per Teamlid</h3>
          <p className="text-xs text-gray-400 mb-4">Verdeling van gerealiseerde uren over het team</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={personData} dataKey="hours" nameKey="name" cx="50%" cy="50%"
                outerRadius={100} innerRadius={50}
                label={({ name, percent }) => `${name.split(" ")[0]} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}>
                {personData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} uur`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Planning Accuracy */}
        {accuracyData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "295ms" }}>
            <h3 className="font-semibold text-gray-900 mb-1">Planning Nauwkeurigheid per Sprint</h3>
            <p className="text-xs text-gray-400 mb-4">100% = perfecte inschatting. Boven 100% = meer uren dan gepland</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="Nauwkeurigheid" radius={[6, 6, 0, 0]}>
                  {accuracyData.map((entry, i) => (
                    <Cell key={i} fill={entry.Nauwkeurigheid > 110 ? "#ef4444" : entry.Nauwkeurigheid > 100 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
                <ReferenceLine y={100} stroke="#6366f1" strokeDasharray="6 3" strokeWidth={2}
                  label={{ value: "100%", fill: "#6366f1", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost breakdown table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <h3 className="font-semibold text-gray-900 mb-4">Kosten per Teamlid</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2.5 font-medium text-gray-500">Naam</th>
                <th className="text-left py-2.5 font-medium text-gray-500">Rol</th>
                <th className="text-right py-2.5 font-medium text-gray-500">Uren</th>
                <th className="text-right py-2.5 font-medium text-gray-500">Kosten</th>
                <th className="text-right py-2.5 font-medium text-gray-500">% van totaal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {personData.map((p, i) => (
                <tr key={i}>
                  <td className="py-2.5 font-medium text-gray-900">{p.name}</td>
                  <td className="py-2.5 text-gray-500">{p.role}</td>
                  <td className="py-2.5 text-right text-gray-700">{p.hours}u</td>
                  <td className="py-2.5 text-right font-medium text-emerald-600">{fmtEur(p.kosten)}</td>
                  <td className="py-2.5 text-right text-gray-500">{totalCost > 0 ? ((p.kosten / totalCost) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={2} className="py-2.5 font-semibold text-gray-900">Totaal</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{totalRealisatie}u</td>
                <td className="py-2.5 text-right font-bold text-emerald-600">{fmtEur(totalCost)}</td>
                <td className="py-2.5 text-right font-semibold text-gray-500">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE HOURS TABLE COMPONENT (with sprint headers)
// ═══════════════════════════════════════════════════════════════
function HoursTable({ title, type, members, weekRange, sprintLength, startWeek, onSetHours, saving }) {
  const cellRefs = useRef({});
  const weeks = Array.from({ length: weekRange.end - weekRange.start + 1 }, (_, i) => weekRange.start + i);
  const sprintRanges = getSprintRanges(weeks, startWeek, sprintLength);

  const getHours = (member, week) => {
    const entry = member.timeEntries?.find((t) => t.weekNumber === week && t.type === type);
    return entry ? entry.hours : "";
  };

  const getCellCost = (member, week) => {
    const entry = member.timeEntries?.find((t) => t.weekNumber === week && t.type === type);
    return entry ? entry.hours * member.hourlyRate : 0;
  };

  const getMemberTotalHours = (member) =>
    (member.timeEntries || []).filter((t) => t.type === type).reduce((s, t) => s + t.hours, 0);

  const getMemberTotalCost = (member) =>
    (member.timeEntries || []).filter((t) => t.type === type).reduce((s, t) => s + t.hours * member.hourlyRate, 0);

  const getWeekTotal = (week) =>
    members.reduce((sum, m) => {
      const entry = m.timeEntries?.find((t) => t.weekNumber === week && t.type === type);
      return sum + (entry ? entry.hours : 0);
    }, 0);

  const getWeekTotalCost = (week) =>
    members.reduce((sum, m) => sum + getCellCost(m, week), 0);

  const getSprintTotalCost = (s) =>
    members.reduce((sum, m) =>
      sum + weeks.slice(s.startIdx, s.startIdx + s.colSpan).reduce((acc, w) => acc + getCellCost(m, w), 0),
    0);

  const handleKeyDown = (e, rowIdx, colIdx) => {
    let nextRow = rowIdx, nextCol = colIdx;
    if (e.key === "Tab" || e.key === "ArrowRight") { e.preventDefault(); nextCol++; }
    else if (e.key === "ArrowLeft") { e.preventDefault(); nextCol--; }
    else if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); nextRow++; }
    else if (e.key === "ArrowUp") { e.preventDefault(); nextRow--; }
    else return;
    const refKey = `${type}-${nextRow}-${nextCol}`;
    if (nextRow >= 0 && nextRow < members.length && nextCol >= 0 && nextCol < weeks.length) {
      cellRefs.current[refKey]?.focus();
      cellRefs.current[refKey]?.select();
    }
  };

  const badgeBg = type === "Planning" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeBg}`}>{type}</span>
          {saving && <span className="text-xs text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full animate-pulse">Opslaan...</span>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {/* Sprint header row */}
            <tr className="bg-gray-100/60">
              <th className="sticky left-0 bg-gray-100/60 z-10 min-w-[180px]"></th>
              {sprintRanges.map((s) => {
                const cost = getSprintTotalCost(s);
                return (
                  <th key={s.sprint} colSpan={s.colSpan}
                    className="px-2 py-2 text-center text-xs font-semibold text-indigo-600 border-l border-gray-200 first:border-l-0">
                    Sprint {s.sprint}
                    {cost > 0 && (
                      <div className="text-[10px] font-medium text-emerald-600 mt-0.5">{fmtEur(cost)}</div>
                    )}
                  </th>
                );
              })}
              <th className={`min-w-[100px] ${type === "Planning" ? "bg-amber-50/50" : "bg-indigo-50/50"}`}></th>
            </tr>
            {/* Week header row */}
            <tr className="bg-gray-50/80">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 sticky left-0 bg-gray-50/80 z-10 min-w-[180px]">Medewerker</th>
              {weeks.map((w) => (
                <th key={w} className="px-2 py-2.5 font-medium text-gray-500 text-center min-w-[80px]">Wk {w}</th>
              ))}
              <th className={`px-4 py-2.5 font-semibold text-gray-700 text-center min-w-[100px] ${type === "Planning" ? "bg-amber-50/50" : "bg-indigo-50/50"}`}>Totaal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m, rowIdx) => (
              <tr key={m.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-gray-50">
                  <div className="font-medium text-gray-900 text-sm">{m.person.name}</div>
                  <div className="text-xs text-gray-400">{fmtEur(m.hourlyRate)}/u</div>
                </td>
                {weeks.map((w, colIdx) => {
                  const cost = getCellCost(m, w);
                  const refKey = `${type}-${rowIdx}-${colIdx}`;
                  return (
                    <td key={w} className="px-1 py-1 text-center">
                      <input
                        ref={(el) => { cellRefs.current[refKey] = el; }}
                        type="number"
                        defaultValue={getHours(m, w)}
                        onBlur={(e) => onSetHours(m, w, e.target.value, type)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.target.blur();
                          handleKeyDown(e, rowIdx, colIdx);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-16 text-center border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 rounded-lg py-1.5 text-sm outline-none transition bg-transparent"
                        min={0} max={80} step={0.5}
                        placeholder="—"
                      />
                      {cost > 0 && (
                        <div className="text-[10px] text-emerald-600 font-medium -mt-0.5 pb-0.5">{fmtEur(cost)}</div>
                      )}
                    </td>
                  );
                })}
                <td className={`px-4 py-2 text-center ${type === "Planning" ? "bg-amber-50/30" : "bg-indigo-50/30"}`}>
                  <div className={`font-semibold ${type === "Planning" ? "text-amber-600" : "text-indigo-600"}`}>{getMemberTotalHours(m)}u</div>
                  {getMemberTotalCost(m) > 0 && (
                    <div className="text-[11px] text-emerald-600 font-semibold">{fmtEur(getMemberTotalCost(m))}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/80 border-t-2 border-gray-200">
              <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50/80 z-10">Totaal</td>
              {weeks.map((w) => {
                const wHours = getWeekTotal(w);
                const wCost = getWeekTotalCost(w);
                return (
                  <td key={w} className="px-2 py-2 text-center">
                    <div className="font-semibold text-gray-700">{wHours || ""}</div>
                    {wCost > 0 && <div className="text-[10px] text-emerald-600 font-semibold">{fmtEur(wCost)}</div>}
                  </td>
                );
              })}
              <td className={`px-4 py-2 text-center ${type === "Planning" ? "bg-amber-50/50" : "bg-indigo-50/50"}`}>
                <div className={`font-bold ${type === "Planning" ? "text-amber-700" : "text-indigo-700"}`}>
                  {members.reduce((s, m) => s + getMemberTotalHours(m), 0)}u
                </div>
                <div className="text-xs text-emerald-600 font-bold">
                  {fmtEur(members.reduce((s, m) => s + getMemberTotalCost(m), 0))}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
        Tip: gebruik pijltjestoetsen, Tab en Enter om snel door de cellen te navigeren. Wijzigingen worden automatisch opgeslagen.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AFAS TABLE — read-only, type "AFAS"
// ═══════════════════════════════════════════════════════════════
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

// Excel serial date (days since Dec 30, 1899) → UTC JS Date
function excelSerialToDate(serial) {
  return new Date((serial - 25569) * 86400 * 1000);
}

// Format a Date as YYYY-MM-DD
function toDateInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Get the start Date of sprint `sprintNum` (1-indexed)
function getAfasSprintStart(sprintNum, overrides, projectStartDate, sprintLengthWeeks) {
  const ovr = overrides.find((s) => s.sprint === sprintNum);
  if (ovr) return new Date(ovr.startDate);
  if (!projectStartDate) return null;
  const d = new Date(projectStartDate);
  d.setUTCDate(d.getUTCDate() + (sprintNum - 1) * (sprintLengthWeeks || 2) * 7);
  return d;
}

// Map a Date to a sprint number given overrides + project defaults
function dateToAfasSprint(date, numSprints, overrides, projectStartDate, sprintLengthWeeks) {
  let result = 1;
  for (let s = 1; s <= numSprints; s++) {
    const start = getAfasSprintStart(s, overrides, projectStartDate, sprintLengthWeeks);
    if (!start || date < start) break;
    result = s;
  }
  return result;
}

const ChevronIcon = ({ collapsed }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

function AfasTable({ members, project, onImport, onClear, onUpdateSprintDate, importing, importResult }) {
  const fileRef = useRef(null);
  const [collapsed, setCollapsed] = useState(true);
  const xlsxRef = useRef(null);

  useEffect(() => {
    import("xlsx").then((mod) => { xlsxRef.current = mod.default ?? mod; }).catch(() => {});
  }, []);

  const sprintOverrides = JSON.parse(project.sprintStartDates || "[]");
  const sprintLengthWeeks = project.sprintLengthWeeks || 2;
  const numConfigured = project.budgetWeeks > 0 ? Math.ceil(project.budgetWeeks / sprintLengthWeeks) : 0;

  // Derive sprint numbers from existing AFAS data + configured count
  const afasSprintNums = [...new Set(
    members.flatMap((m) => (m.timeEntries || []).filter((t) => t.type === "AFAS").map((t) => t.weekNumber))
  )].sort((a, b) => a - b);
  const maxSprint = Math.max(numConfigured, ...afasSprintNums, 1);
  const sprints = Array.from({ length: maxSprint }, (_, i) => i + 1);

  const getSprintHours = (member, sprintNum) => {
    const entry = member.timeEntries?.find((t) => t.weekNumber === sprintNum && t.type === "AFAS");
    return entry ? entry.hours : null;
  };

  const getMemberTotal = (member) =>
    (member.timeEntries || []).filter((t) => t.type === "AFAS").reduce((s, t) => s + t.hours, 0);

  const getSprintTotal = (sprintNum) =>
    members.reduce((sum, m) => {
      const e = m.timeEntries?.find((t) => t.weekNumber === sprintNum && t.type === "AFAS");
      return sum + (e ? e.hours : 0);
    }, 0);

  const hasAnyData = members.some((m) => getMemberTotal(m) > 0);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = xlsxRef.current ?? (await import("xlsx").then((m) => m.default ?? m));
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    const headerIdx = raw.findIndex((r) => r.some((c) => String(c).trim() === "Werksoort"));
    const dataRows = headerIdx >= 0 ? raw.slice(headerIdx + 1) : raw.slice(1);
    const header = raw[headerIdx] ?? [];
    const colIdx = (name) => header.findIndex((c) => String(c).trim() === name);

    const iDatum = colIdx("Datum");
    const iNaam  = colIdx("Naam");
    const iAant  = colIdx("Aant.");
    const iWerk  = colIdx("Werksoort");

    const naam = (r) => String(r[iNaam >= 0 ? iNaam : 4] ?? "").trim();
    const aant = (r) => Number(r[iAant >= 0 ? iAant : 6]) || 0;
    const werk = (r) => String(r[iWerk >= 0 ? iWerk : 7] ?? "").trim();
    const datum = (r) => {
      const v = r[iDatum >= 0 ? iDatum : 3];
      return v ? excelSerialToDate(Number(v)) : null;
    };

    // Determine max possible sprint count for mapping (use budgetWeeks or fall back to 20)
    const numSprints = Math.max(numConfigured, 20);

    const rows = dataRows
      .filter((r) => werk(r) === "BILL" && naam(r) && datum(r) && aant(r) > 0)
      .map((r) => ({
        naam: naam(r),
        weekNumber: dateToAfasSprint(datum(r), numSprints, sprintOverrides, project.startDate, sprintLengthWeeks),
        hours: aant(r),
      }));

    e.target.value = "";
    onImport(rows);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150 -ml-1"
            title={collapsed ? "Uitklappen" : "Inklappen"}
          >
            <ChevronIcon collapsed={collapsed} />
          </button>
          <h2 className="font-semibold text-gray-900">AFAS Nacalculatie</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-teal-100 text-teal-700">AFAS</span>
          {importing && <span className="text-xs text-teal-600 bg-teal-50 px-3 py-1 rounded-full animate-pulse">Importeren...</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasAnyData && (
            <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50">
              Wissen
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white transition-all duration-150 ${importing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <UploadIcon /> AFAS importeren
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={handleFile} />
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Import result banner */}
          {importResult && (
            <div className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2 ${
              importResult.unmatched.length > 0 ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
            }`}>
              <div className="flex-1">
                <span className="font-semibold">{importResult.created} regels geïmporteerd</span>
                {importResult.matched.length > 0 && (
                  <span className="ml-2 text-teal-700">✓ {importResult.matched.join(", ")}</span>
                )}
                {importResult.unmatched.length > 0 && (
                  <span className="ml-2 text-amber-700">⚠ Niet herkend: {importResult.unmatched.join(", ")}</span>
                )}
              </div>
            </div>
          )}

          {/* Sprint date hint */}
          <div className="mx-4 mt-3 mb-1 px-4 py-2.5 rounded-xl bg-gray-50 text-xs text-gray-500 flex items-start gap-2">
            <span className="shrink-0">📅</span>
            <span>
              Pas de startdatum van een sprint aan als die sprint later begon dan gepland.
              Uren worden op basis van de exacte datum uit AFAS aan de juiste sprint toegewezen.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-50/40">
                  <th className="sticky left-0 bg-teal-50/40 z-10 min-w-[180px]" />
                  {sprints.map((s) => {
                    const startDate = getAfasSprintStart(s, sprintOverrides, project.startDate, sprintLengthWeeks);
                    const isOverridden = sprintOverrides.some((o) => o.sprint === s);
                    return (
                      <th key={s} className="px-2 py-2 text-center text-xs font-semibold text-teal-700 border-l border-gray-200 first:border-l-0 min-w-[120px]">
                        <div>Sprint {s}</div>
                        <input
                          type="date"
                          value={startDate ? toDateInput(startDate) : ""}
                          onChange={(e) => onUpdateSprintDate(s, e.target.value)}
                          className={`mt-1 w-full text-center text-[10px] font-normal border rounded-md px-1 py-0.5 outline-none focus:ring-1 focus:ring-teal-400 transition ${
                            isOverridden
                              ? "border-teal-300 text-teal-700 bg-teal-50"
                              : "border-gray-200 text-gray-400 bg-white"
                          }`}
                          title={isOverridden ? "Aangepaste startdatum" : "Berekende startdatum (klik om aan te passen)"}
                        />
                      </th>
                    );
                  })}
                  <th className="min-w-[90px] bg-teal-50/60" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!hasAnyData && !importing ? (
                  <tr>
                    <td colSpan={sprints.length + 2} className="px-6 py-10 text-center text-gray-400">
                      Nog geen AFAS data. Klik op <strong>AFAS importeren</strong> om een export te uploaden.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="hover:bg-teal-50/20">
                      <td className="px-4 py-2.5 sticky left-0 bg-white z-10 border-r border-gray-50">
                        <div className="font-medium text-gray-900 text-sm">{m.person.name}</div>
                        <div className="text-xs text-gray-400">{m.person.role}</div>
                      </td>
                      {sprints.map((s) => {
                        const h = getSprintHours(m, s);
                        return (
                          <td key={s} className="px-3 py-2.5 text-center border-l border-gray-50">
                            {h != null && h > 0 ? (
                              <span className="text-sm font-medium text-teal-700">{h}u</span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center bg-teal-50/30">
                        <div className="font-semibold text-teal-700">
                          {getMemberTotal(m) > 0 ? `${getMemberTotal(m)}u` : "—"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {hasAnyData && (
                <tfoot>
                  <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50/80 z-10">Totaal</td>
                    {sprints.map((s) => {
                      const t = getSprintTotal(s);
                      return (
                        <td key={s} className="px-3 py-2 text-center border-l border-gray-100">
                          <span className={`font-semibold ${t > 0 ? "text-teal-700" : "text-gray-200"}`}>
                            {t > 0 ? `${t}u` : "—"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center bg-teal-50/50">
                      <div className="font-bold text-teal-700">
                        {members.reduce((s, m) => s + getMemberTotal(m), 0)}u
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROJECT DETAIL PAGE
// ═══════════════════════════════════════════════════════════════
export default function ProjectDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [newMember, setNewMember] = useState({ personId: "", hourlyRate: 100 });
  const [newPerson, setNewPerson] = useState({ name: "", role: "" });
  const [weekRange, setWeekRange] = useState({ start: 1, end: 12 });
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState("hours"); // "hours" | "stats"
  const [editForm, setEditForm] = useState({});
  const [importingAfas, setImportingAfas] = useState(false);
  const [afasResult, setAfasResult] = useState(null);

  const load = async () => {
    const [proj, ppl] = await Promise.all([fetchProject(id), fetchPeople()]);
    setProject(proj);
    setPeople(ppl);
    if (proj.budgetWeeks > 0) {
      setWeekRange((prev) => ({ ...prev, end: proj.budgetWeeks }));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const handleAfasImport = useCallback(async (rows) => {
    setImportingAfas(true);
    try {
      const result = await importAfas(id, rows);
      setAfasResult(result);
      load();
    } finally {
      setImportingAfas(false);
    }
  }, [id]);

  const handleAfasClear = useCallback(async () => {
    await deleteAfas(id);
    setAfasResult(null);
    load();
  }, [id]);

  const handleUpdateSprintDate = useCallback(async (sprintNum, dateStr) => {
    const current = JSON.parse(project.sprintStartDates || "[]");
    const updated = current.filter((s) => s.sprint !== sprintNum);
    if (dateStr) updated.push({ sprint: sprintNum, startDate: dateStr });
    updated.sort((a, b) => a.sprint - b.sprint);
    await updateProject({ ...project, sprintStartDates: JSON.stringify(updated) });
    load();
  }, [project]);

  const handleSetHours = useCallback(async (member, week, value, type) => {
    const hours = value === "" ? 0 : parseFloat(value);
    if (isNaN(hours)) return;
    setSaving(true);
    try {
      await upsertTimeEntry({ projectMemberId: member.id, weekNumber: week, hours, type });
      setProject((prev) => {
        const updated = { ...prev, members: prev.members.map((m) => {
          if (m.id !== member.id) return m;
          const idx = m.timeEntries.findIndex((t) => t.weekNumber === week && t.type === type);
          let newEntries = [...m.timeEntries];
          if (hours === 0) {
            newEntries = newEntries.filter((t) => !(t.weekNumber === week && t.type === type));
          } else if (idx >= 0) {
            newEntries[idx] = { ...newEntries[idx], hours };
          } else {
            newEntries.push({ id: Date.now(), projectMemberId: member.id, weekNumber: week, hours, type });
          }
          return { ...m, timeEntries: newEntries };
        })};
        return updated;
      });
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading || !project) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-gray-400">Laden...</main>
      </div>
    );
  }

  const members = project.members || [];
  const availablePeople = people.filter((p) => !members.some((m) => m.personId === p.id));
  const sprintLength = project.sprintLengthWeeks || 2;

  const handleAddMember = async () => {
    if (!newMember.personId) return;
    await addMember({ projectId: project.id, personId: parseInt(newMember.personId), hourlyRate: parseFloat(newMember.hourlyRate) || 100 });
    setNewMember({ personId: "", hourlyRate: 100 });
    setShowAddMember(false);
    load();
  };

  const handleRemoveMember = async (memberId) => {
    await removeMember(memberId);
    load();
  };

  const handleAddPerson = async () => {
    if (!newPerson.name.trim()) return;
    const person = await createPerson({ name: newPerson.name, role: newPerson.role || "Medewerker" });
    setNewPerson({ name: "", role: "" });
    setShowNewPerson(false);
    setNewMember((prev) => ({ ...prev, personId: String(person.id) }));
    setPeople((prev) => [...prev, person]);
  };

  const openEditProject = () => {
    setEditForm({
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      budget: project.budget || 0,
      budgetWeeks: project.budgetWeeks || 0,
      sprintLengthWeeks: project.sprintLengthWeeks || 2,
    });
    setShowEditProject(true);
  };

  const handleEditProject = async () => {
    await updateProject({ id: project.id, ...editForm });
    setShowEditProject(false);
    load();
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-4 transition">
            <BackIcon /> Terug naar projecten
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6 animate-fade-in-up">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <button onClick={openEditProject} className="text-gray-400 hover:text-indigo-600 transition"><PencilIcon /></button>
              </div>
              <p className="text-gray-500 mt-1">{project.description || "Geen beschrijving"}</p>
              {project.startDate && <p className="text-xs text-gray-400 mt-1">Gestart: {new Date(project.startDate).toLocaleDateString("nl-NL")}</p>}
            </div>
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button onClick={() => setActiveView("hours")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === "hours" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  <TableIcon /> Uren
                </button>
                <button onClick={() => setActiveView("stats")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === "stats" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  <ChartIcon /> Statistieken
                </button>
              </div>
              {/* Week range (only in hours view) */}
              {activeView === "hours" && (
                <div className="flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm animate-fade-in">
                  <span className="text-gray-500 font-medium">Weken:</span>
                  <input type="number" value={weekRange.start} onChange={(e) => setWeekRange({ ...weekRange, start: parseInt(e.target.value) || 1 })}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" min={1} max={53} />
                  <span className="text-gray-400">—</span>
                  <input type="number" value={weekRange.end} onChange={(e) => setWeekRange({ ...weekRange, end: parseInt(e.target.value) || 12 })}
                    className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" min={1} max={53} />
                </div>
              )}
            </div>
          </div>

          {/* Budget Progress (always visible) */}
          <BudgetProgress project={project} members={members} />

          {/* ── View content — key triggers re-animation on tab switch ── */}
          <div key={activeView}>
            {/* ── Hours View ── */}
            {activeView === "hours" && (
              <>
                {/* Team Section */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 animate-fade-in-up">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                    <h2 className="font-semibold text-gray-900">Teamleden</h2>
                    <button onClick={() => setShowAddMember(true)}
                      className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition">
                      <PlusIcon /> Lid toevoegen
                    </button>
                  </div>
                  {members.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400 text-sm">Nog geen teamleden. Voeg iemand toe om te beginnen.</div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 transition-colors duration-150">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", color: "#6366f1" }}>
                              {m.person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{m.person.name}</div>
                              <div className="text-xs text-gray-400">{m.person.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500">{fmtEur(m.hourlyRate)}/uur</div>
                            <button onClick={() => handleRemoveMember(m.id)} className="text-gray-300 hover:text-red-500 active:scale-90 transition-all duration-150"><TrashIcon /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tables */}
                {members.length > 0 && (
                  <div className="space-y-6">
                    <div className="animate-fade-in-up delay-100">
                      <HoursTable title="Planning" type="Planning" members={members} weekRange={weekRange}
                        sprintLength={sprintLength} startWeek={weekRange.start} onSetHours={handleSetHours} saving={saving} />
                    </div>
                    <div className="animate-fade-in-up delay-200">
                      <HoursTable title="Realisatie" type="Realisatie" members={members} weekRange={weekRange}
                        sprintLength={sprintLength} startWeek={weekRange.start} onSetHours={handleSetHours} saving={saving} />
                    </div>
                    <div className="animate-fade-in-up delay-300">
                      <AfasTable
                        members={members}
                        project={project}
                        onImport={handleAfasImport}
                        onClear={handleAfasClear}
                        onUpdateSprintDate={handleUpdateSprintDate}
                        importing={importingAfas}
                        importResult={afasResult}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Stats View ── */}
            {activeView === "stats" && (
              <ProjectStats project={project} members={members} />
            )}
          </div>

          {/* ── Add Member Modal ── */}
          <Modal open={showAddMember} onClose={() => { setShowAddMember(false); setShowNewPerson(false); }} title="Teamlid Toevoegen">
            <div className="space-y-4">
              {!showNewPerson ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Persoon</label>
                    <select value={newMember.personId} onChange={(e) => setNewMember({ ...newMember, personId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Selecteer een persoon...</option>
                      {availablePeople.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.role}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => setShowNewPerson(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    + Nieuwe persoon aanmaken
                  </button>
                </>
              ) : (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-sm text-gray-700">Nieuwe persoon</h3>
                  <input value={newPerson.name} onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    placeholder="Naam" autoFocus />
                  <input value={newPerson.role} onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    placeholder="Rol (bijv. Developer, Designer)" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewPerson(false)} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Annuleren</button>
                    <button onClick={handleAddPerson} className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Toevoegen</button>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uurtarief (€)</label>
                <input type="number" value={newMember.hourlyRate} onChange={(e) => setNewMember({ ...newMember, hourlyRate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" min={0} step={5} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowAddMember(false); setShowNewPerson(false); }} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Annuleren</button>
                <button onClick={handleAddMember} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">Toevoegen</button>
              </div>
            </div>
          </Modal>

          {/* ── Edit Project Modal ── */}
          <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Project Bewerken">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projectnaam</label>
                <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input type="date" value={editForm.startDate || ""} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sprint lengte (weken)</label>
                  <input type="number" value={editForm.sprintLengthWeeks || 2} onChange={(e) => setEditForm({ ...editForm, sprintLengthWeeks: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" min={1} max={4} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (€)</label>
                  <input type="number" value={editForm.budget || 0} onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" min={0} step={1000} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget looptijd (weken)</label>
                  <input type="number" value={editForm.budgetWeeks || 0} onChange={(e) => setEditForm({ ...editForm, budgetWeeks: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" min={0} max={104} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowEditProject(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Annuleren</button>
                <button onClick={handleEditProject} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">Opslaan</button>
              </div>
            </div>
          </Modal>
        </div>
      </main>
    </div>
  );
}
