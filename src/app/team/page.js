"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Modal from "@/components/Modal";
import { PlusIcon, TrashIcon } from "@/components/Icons";
import { fetchPeople, createPerson, updatePerson, deletePerson } from "@/lib/api";

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
  </svg>
);

export default function TeamPage() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = new, object = editing
  const [form, setForm] = useState({ name: "", role: "" });

  const load = () => fetchPeople().then(setPeople).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", role: "" });
    setShowModal(true);
  };

  const openEdit = (person) => {
    setEditing(person);
    setForm({ name: person.name, role: person.role });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await updatePerson({ id: editing.id, name: form.name, role: form.role || "Medewerker" });
    } else {
      await createPerson({ name: form.name, role: form.role || "Medewerker" });
    }
    setShowModal(false);
    setForm({ name: "", role: "" });
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await deletePerson(id);
    load();
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teamleden</h1>
              <p className="text-gray-500 mt-1">Beheer je medewerkers en hun rollen</p>
            </div>
            <button onClick={openNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-200">
              <PlusIcon /> Nieuw Teamlid
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Laden...</div>
          ) : people.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">Nog geen teamleden</p>
              <p className="text-sm mt-1">Voeg je eerste medewerker toe.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-medium text-gray-500">Naam</th>
                    <th className="text-left px-6 py-4 font-medium text-gray-500">Rol</th>
                    <th className="text-left px-6 py-4 font-medium text-gray-500">Projecten</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {people.map((person) => (
                    <tr key={person.id} className="hover:bg-gray-50/50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                            {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="font-medium text-gray-900">{person.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {person.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {person.members && person.members.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {person.members.map((m) => (
                              <span key={m.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-600">
                                {m.project.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Geen projecten</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEdit(person)} className="text-gray-400 hover:text-indigo-600 transition" title="Bewerken">
                            <PencilIcon />
                          </button>
                          <button onClick={() => handleDelete(person.id)} className="text-gray-400 hover:text-red-500 transition" title="Verwijderen">
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Teamlid Bewerken" : "Nieuw Teamlid"}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Volledige naam" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="bijv. Developer, Designer, Project Manager" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Annuleren</button>
                <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
                  {editing ? "Opslaan" : "Aanmaken"}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </main>
    </div>
  );
}
