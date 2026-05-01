"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, BackIcon, TrashIcon } from "@/components/Icons";
import { fetchProject, fetchPeople, createPerson, addMember, removeMember, upsertTimeEntry, updateProject } from "@/lib/api";
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
function BudgetProgress({ project, members, weekRange }) {
  const budget = project.budget || 0;
  const budgetWeeks = project.budgetWeeks || 0;

  // Calculate current spend
  const totalSpend = members.reduce((sum, m) =>
    sum + (m.timeEntries || [])
      .filter((t) => t.type === "Realisatie")
      .reduce((s, t) => s + t.hours * m.hourlyRate, 0),
  0);

  // Time elapsed
  const currentWeek = weekRange.end;
  const timePercentage = budgetWeeks > 0 ? Math.min((currentWeek / budgetWeeks) * 100, 100) : 0;
  const budgetPercentage = budget > 0 ? (totalSpend / budget) * 100 : 0;
  const isOverBudget = budgetPercentage > 100;
  const isAheadOfSchedule = budgetPercentage > timePercentage;

  if (budget === 0 && budgetWeeks === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-6">
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
          <div className="text-xl font-bold text-gray-900">Wk {currentWeek} / {budgetWeeks}</div>
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
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="text-xs text-gray-500">{kpi.label}</div>
            <div className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Burn Chart */}
        {budget > 0 && burnData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
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

  const colorAccent = type === "Planning" ? "amber" : "indigo";
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
              {sprintRanges.map((s) => (
                <th key={s.sprint} colSpan={s.colSpan}
                  className="px-2 py-2 text-center text-xs font-semibold text-indigo-600 border-l border-gray-200 first:border-l-0">
                  Sprint {s.sprint}
                </th>
              ))}
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

  const load = async () => {
    const [proj, ppl] = await Promise.all([fetchProject(id), fetchPeople()]);
    setProject(proj);
    setPeople(ppl);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

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
          <div className="flex items-start justify-between mb-6">
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeView === "hours" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  <TableIcon /> Uren
                </button>
                <button onClick={() => setActiveView("stats")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeView === "stats" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  <ChartIcon /> Statistieken
                </button>
              </div>
              {/* Week range (only in hours view) */}
              {activeView === "hours" && (
                <div className="flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
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
          <BudgetProgress project={project} members={members} weekRange={weekRange} />

          {/* ── Hours View ── */}
          {activeView === "hours" && (
            <>
              {/* Team Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
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
                      <div key={m.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {m.person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{m.person.name}</div>
                            <div className="text-xs text-gray-400">{m.person.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">{fmtEur(m.hourlyRate)}/uur</div>
                          <button onClick={() => handleRemoveMember(m.id)} className="text-gray-300 hover:text-red-500 transition"><TrashIcon /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tables */}
              {members.length > 0 && (
                <div className="space-y-6">
                  <HoursTable title="Planning" type="Planning" members={members} weekRange={weekRange}
                    sprintLength={sprintLength} startWeek={weekRange.start} onSetHours={handleSetHours} saving={saving} />
                  <HoursTable title="Realisatie" type="Realisatie" members={members} weekRange={weekRange}
                    sprintLength={sprintLength} startWeek={weekRange.start} onSetHours={handleSetHours} saving={saving} />
                </div>
              )}
            </>
          )}

          {/* ── Stats View ── */}
          {activeView === "stats" && (
            <ProjectStats project={project} members={members} />
          )}

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
