"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, UsersIcon, ClockIcon, EuroIcon, FolderIcon, TrashIcon } from "@/components/Icons";
import { fetchProjects, createProject, deleteProject } from "@/lib/api";
import { fmtEur } from "@/lib/utils";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl animate-shimmer" />
      </div>
      <div className="h-5 w-3/4 rounded-lg animate-shimmer mb-2" />
      <div className="h-3.5 w-full rounded animate-shimmer mb-1" />
      <div className="h-3.5 w-2/3 rounded animate-shimmer mb-5" />
      <div className="flex gap-4 pt-4 border-t border-gray-50">
        <div className="h-3.5 w-12 rounded animate-shimmer" />
        <div className="h-3.5 w-12 rounded animate-shimmer" />
        <div className="h-3.5 w-16 rounded animate-shimmer" />
      </div>
    </div>
  );
}

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
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-in-up">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Projecten</h1>
              <p className="text-gray-500 mt-1 text-sm">Beheer je actieve projecten en urenregistratie</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 shadow-lg shadow-indigo-200"
            >
              <PlusIcon /> Nieuw Project
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 animate-fade-in-up delay-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-300 flex items-center justify-center mx-auto mb-4">
                <FolderIcon />
              </div>
              <p className="text-lg font-medium text-gray-500">Nog geen projecten</p>
              <p className="text-sm text-gray-400 mt-1">Maak je eerste project aan om te beginnen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects.map((p, index) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative animate-fade-in-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => router.push(`/project/${p.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <FolderIcon />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-gray-300 hover:text-red-500 active:scale-90 transition-all duration-150 opacity-0 group-hover:opacity-100"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base">{p.name}</h3>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.description || "Geen beschrijving"}</p>
                    <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"><UsersIcon /> {p.memberCount}</span>
                      <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"><ClockIcon /> {p.totalHours}u</span>
                      <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors"><EuroIcon /> {fmtEur(p.totalCost)}</span>
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
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                  placeholder="bijv. Website Redesign"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-shadow"
                  rows={3}
                  placeholder="Korte beschrijving van het project..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Annuleren
                </button>
                <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all duration-150">
                  Aanmaken
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </main>
    </div>
  );
}
