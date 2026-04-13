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

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats().then(setStats).finally(() => setLoading(false)); }, []);

  if (loading || !stats) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center text-gray-400">Laden...</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Statistieken & Rapportage</h1>
            <p className="text-gray-500 mt-1">Inzicht in uren, kosten en verdeling over projecten</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Totale Uren", value: `${stats.totalHours}u` },
              { label: "Totale Kosten", value: fmtEur(stats.totalCost) },
              { label: "Projecten", value: stats.projectCount },
              { label: "Medewerkers", value: stats.peopleCount },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
                <div className="text-sm text-gray-500">{kpi.label}</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost per Project */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Kosten per Project</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.costPerProject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(value) => fmtEur(value)} />
                  <Bar dataKey="kosten" fill="#6366f1" radius={[6, 6, 0, 0]} name="Kosten" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hours per Week */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Uren per Week</h3>
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
            </div>

            {/* Hours per Person */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Uren per Medewerker</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.hoursPerPerson} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={55}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={true}>
                    {stats.hoursPerPerson.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} uur`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Hours per Project */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Uren per Project</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.costPerProject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="uren" fill="#10b981" radius={[6, 6, 0, 0]} name="Uren" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
