"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, UsersIcon, ClockIcon, EuroIcon, FolderIcon, TrashIcon } from "@/components/Icons";
import { fetchProjects, createProject, deleteProject } from "@/lib/api";
import { fmtEur } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", startDate: "" });

  const load = () => fetchProjects().then(setProjects).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createProject(form);
    setForm({ name: "", description: "", startDate: "" });
    setShowModal(false);
    load();
  };

  const handleDelete = async (id) => {
    await deleteProject(id);
    load();
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projecten</h1>
              <p className="text-gray-500 mt-1">Beheer je actieve projecten en urenregistratie</p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-200">
              <PlusIcon /> Nieuw Project
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Laden...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="mt-4 text-lg">Nog geen projecten</p>
              <p className="text-sm">Maak je eerste project aan om te beginnen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects.map((p) => (
                <div key={p.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group relative"
                  onClick={() => router.push(`/project/${p.id}`)}>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><FolderIcon /></div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{p.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.description || "Geen beschrijving"}</p>
                    <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><UsersIcon /> {p.memberCount}</span>
                      <span className="flex items-center gap-1.5"><ClockIcon /> {p.totalHours}u</span>
                      <span className="flex items-center gap-1.5"><EuroIcon /> {fmtEur(p.totalCost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Modal open={showModal} onClose={() => setShowModal(false)} title="Nieuw Project">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Projectnaam *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="bijv. Website Redesign" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                  rows={3} placeholder="Korte beschrijving van het project..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Annuleren</button>
                <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">Aanmaken</button>
              </div>
            </div>
          </Modal>
        </div>
      </main>
    </div>
  );
}
