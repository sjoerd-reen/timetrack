"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, BackIcon, TrashIcon } from "@/components/Icons";
import { fetchProject, fetchPeople, createPerson, addMember, removeMember, upsertTimeEntry } from "@/lib/api";
import { fmtEur } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// REUSABLE HOURS TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════
function HoursTable({ title, type, members, weekRange, onSetHours, saving }) {
  const cellRefs = useRef({});
  const weeks = Array.from({ length: weekRange.end - weekRange.start + 1 }, (_, i) => weekRange.start + i);

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
            <tr className="bg-gray-50/80">
              <th className="text-left px-4 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50/80 z-10 min-w-[180px]">Medewerker</th>
              {weeks.map((w) => (
                <th key={w} className="px-2 py-3 font-medium text-gray-500 text-center min-w-[80px]">Wk {w}</th>
              ))}
              <th className={`px-4 py-3 font-semibold text-gray-700 text-center min-w-[100px] ${type === "Planning" ? "bg-amber-50/50" : "bg-indigo-50/50"}`}>Totaal</th>
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
  const [newMember, setNewMember] = useState({ personId: "", hourlyRate: 100 });
  const [newPerson, setNewPerson] = useState({ name: "", role: "" });
  const [weekRange, setWeekRange] = useState({ start: 1, end: 12 });
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-4 transition">
            <BackIcon /> Terug naar projecten
          </button>

          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500 mt-1">{project.description || "Geen beschrijving"}</p>
              {project.startDate && <p className="text-xs text-gray-400 mt-1">Gestart: {new Date(project.startDate).toLocaleDateString("nl-NL")}</p>}
            </div>
            {/* Week range selector */}
            <div className="flex items-center gap-2 text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <span className="text-gray-500 font-medium">Weken:</span>
              <input type="number" value={weekRange.start} onChange={(e) => setWeekRange({ ...weekRange, start: parseInt(e.target.value) || 1 })}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" min={1} max={53} />
              <span className="text-gray-400">—</span>
              <input type="number" value={weekRange.end} onChange={(e) => setWeekRange({ ...weekRange, end: parseInt(e.target.value) || 12 })}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" min={1} max={53} />
            </div>
          </div>

          {/* ── Team Section ── */}
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

          {/* ── Two Separate Tables: Planning & Realisatie ── */}
          {members.length > 0 && (
            <div className="space-y-6">
              <HoursTable
                title="Planning"
                type="Planning"
                members={members}
                weekRange={weekRange}
                onSetHours={handleSetHours}
                saving={saving}
              />
              <HoursTable
                title="Realisatie"
                type="Realisatie"
                members={members}
                weekRange={weekRange}
                onSetHours={handleSetHours}
                saving={saving}
              />
            </div>
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
        </div>
      </main>
    </div>
  );
}
