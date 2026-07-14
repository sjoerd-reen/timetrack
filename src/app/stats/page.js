"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { fmtEur } from "@/lib/utils";
import { fetchStats } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-shimmer rounded-xl ${className}`} />;
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats().then(setStats).finally(() => setLoading(false)); }, []);

  if (loading || !stats) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="mb-8 animate-fade-in-up">
              <SkeletonBlock className="h-7 w-48 mb-2" />
              <SkeletonBlock className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
                  <SkeletonBlock className="h-3.5 w-24 mb-3" />
                  <SkeletonBlock className="h-7 w-20" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-8 animate-fade-in-up">
            <h1 className="text-2xl font-bold text-gray-900">Statistieken & Rapportage</h1>
            <p className="text-gray-500 mt-1 text-sm">Inzicht in uren, kosten en verdeling over projecten</p>
          </div>

          {/* Sprint Budget Overzicht per project */}
          {stats.sprintOverview?.length > 0 && (
            <div className="mb-10 space-y-6 animate-fade-in-up delay-50">
              <h2 className="text-base font-semibold text-gray-700">Sprint Budget Overzicht</h2>
              {stats.sprintOverview.map((project) => {
                let runningBudget = project.totalBudget || 0;
                let cumCost = 0;
                const rows = project.sprints.map((s) => {
                  const meerwerk = s.budget != null ? s.cost - s.budget : null;
                  if (meerwerk != null && meerwerk > 0) runningBudget += meerwerk;
                  cumCost += s.cost;
                  const pct = runningBudget > 0 ? Math.min(100, (s.cost / runningBudget) * 100) : 0;
                  return { ...s, meerwerk, pct, snapshotBudget: runningBudget };
                });
                const totaalPct = runningBudget > 0 ? Math.min(100, (cumCost / runningBudget) * 100) : 0;
                const totaalMeerwerk = project.sprints.reduce((acc, s) => acc + (s.budget != null ? s.cost - s.budget : 0), 0);
                const hasBudgets = project.sprints.some((s) => s.budget != null);

                return (
                  <div key={project.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {project.totalBudget > 0 && (
                        <span className="text-xs text-gray-400">Totaalbudget: {fmtEur(project.totalBudget)}</span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-teal-600 text-white">
                            <th className="px-5 py-3 text-left font-medium text-sm">Sprint</th>
                            <th className="px-5 py-3 text-right font-medium text-sm">Gerealiseerde kosten</th>
                            {hasBudgets && <th className="px-5 py-3 text-right font-medium text-sm">Budget sprint</th>}
                            {hasBudgets && <th className="px-5 py-3 text-right font-medium text-sm">Meerwerk</th>}
                            {hasBudgets && <th className="px-5 py-3 text-right font-medium text-sm">Huidig totaalbudget</th>}
                            <th className="px-5 py-3 text-left font-medium text-sm min-w-[180px]">Verbruikt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rows.map((row, i) => (
                            <tr key={row.sprint} className={i % 2 === 1 ? "bg-gray-50/60" : ""}>
                              <td className="px-5 py-3 font-medium text-gray-900">Sprint {row.sprint}</td>
                              <td className="px-5 py-3 text-right text-gray-700">{row.cost > 0 ? fmtEur(row.cost) : <span className="text-gray-300">—</span>}</td>
                              {hasBudgets && <td className="px-5 py-3 text-right text-gray-500">{row.budget != null ? fmtEur(row.budget) : <span className="text-gray-300">—</span>}</td>}
                              {hasBudgets && (
                                <td className="px-5 py-3 text-right">
                                  {row.meerwerk == null ? <span className="text-gray-300">—</span>
                                    : row.meerwerk > 0 ? <span className="font-medium text-orange-500">+{fmtEur(row.meerwerk)}</span>
                                    : row.meerwerk < 0 ? <span className="font-medium text-emerald-600">-{fmtEur(Math.abs(row.meerwerk))}</span>
                                    : <span className="text-gray-400">—</span>}
                                </td>
                              )}
                              {hasBudgets && <td className="px-5 py-3 text-right text-gray-700">{fmtEur(row.snapshotBudget)}</td>}
                              <td className="px-5 py-3">
                                {row.cost > 0 ? (
                                  <>
                                    <div className="w-40 h-1.5 rounded-full bg-gray-100 overflow-hidden mb-1">
                                      <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${row.pct}%` }} />
                                    </div>
                                    <div className="text-xs text-gray-400">{row.pct.toFixed(1)}% van budget</div>
                                  </>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-teal-600 text-white">
                            <td className="px-5 py-3 font-semibold">Totaal</td>
                            <td className="px-5 py-3 text-right font-semibold">{fmtEur(cumCost)}</td>
                            {hasBudgets && <td className="px-5 py-3 text-right font-semibold">{fmtEur(project.sprints.reduce((s, r) => s + (r.budget ?? 0), 0))}</td>}
                            {hasBudgets && (
                              <td className="px-5 py-3 text-right font-semibold">
                                {totaalMeerwerk > 0 ? `+${fmtEur(totaalMeerwerk)}` : totaalMeerwerk < 0 ? `-${fmtEur(Math.abs(totaalMeerwerk))}` : "—"}
                              </td>
                            )}
                            {hasBudgets && <td className="px-5 py-3 text-right font-semibold">{fmtEur(runningBudget)}</td>}
                            <td className="px-5 py-3">
                              <div className="w-40 h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.25)" }}>
                                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${totaalPct}%` }} />
                              </div>
                              <div className="text-xs text-white/75">{totaalPct.toFixed(1)}% van budget</div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Totale Uren",  value: `${stats.totalHours}u`, color: "text-indigo-600", bg: "bg-indigo-50", delay: "delay-50" },
              { label: "Totale Kosten", value: fmtEur(stats.totalCost), color: "text-emerald-600", bg: "bg-emerald-50", delay: "delay-100" },
              { label: "Projecten",    value: stats.projectCount, color: "text-violet-600", bg: "bg-violet-50", delay: "delay-150" },
              { label: "Medewerkers",  value: stats.peopleCount, color: "text-amber-600", bg: "bg-amber-50", delay: "delay-200" },
            ].map((kpi, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 animate-fade-in-up ${kpi.delay} hover:shadow-md transition-shadow duration-200`}>
                <div className="text-xs font-medium text-gray-400 mb-1">{kpi.label}</div>
                <div className={`text-2xl font-bold mt-1 ${kpi.color} animate-count-up`}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                title: "Kosten per Project",
                delay: "delay-100",
                chart: (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.costPerProject}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                      <Tooltip formatter={(value) => fmtEur(value)} />
                      <Bar dataKey="kosten" fill="#6366f1" radius={[6, 6, 0, 0]} name="Kosten" />
                    </BarChart>
                  </ResponsiveContainer>
                ),
              },
              {
                title: "Uren per Week",
                delay: "delay-150",
                chart: (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.hoursPerWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Realisatie" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Planning" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ),
              },
              {
                title: "Uren per Medewerker",
                delay: "delay-200",
                chart: (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stats.hoursPerPerson} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={55}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine>
                        {stats.hoursPerPerson.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} uur`} />
                    </PieChart>
                  </ResponsiveContainer>
                ),
              },
              {
                title: "Uren per Project",
                delay: "delay-250",
                chart: (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.costPerProject}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="uren" fill="#10b981" radius={[6, 6, 0, 0]} name="Uren" />
                    </BarChart>
                  </ResponsiveContainer>
                ),
              },
            ].map(({ title, chart, delay }) => (
              <div key={title} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-in-up ${delay} hover:shadow-md transition-shadow duration-200`}>
                <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
                {chart}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
