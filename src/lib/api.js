// ─── Centralized API helpers ────────────────────────────────

const json = (res) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// Projects
export const fetchProjects = () => fetch("/api/projects").then(json);
export const fetchProject = (id) => fetch(`/api/projects/${id}`).then(json);
export const createProject = (data) =>
  fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);
export const updateProject = (data) =>
  fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);
export const deleteProject = (id) =>
  fetch(`/api/projects?id=${id}`, { method: "DELETE" }).then(json);

// People
export const fetchPeople = () => fetch("/api/people").then(json);
export const createPerson = (data) =>
  fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);
export const updatePerson = (data) =>
  fetch("/api/people", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);
export const deletePerson = (id) =>
  fetch(`/api/people?id=${id}`, { method: "DELETE" }).then(json);

// Members
export const addMember = (data) =>
  fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);
export const removeMember = (id) =>
  fetch(`/api/members?id=${id}`, { method: "DELETE" }).then(json);

// Time entries
export const upsertTimeEntry = (data) =>
  fetch("/api/time-entries", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(json);

// AFAS import
export const importAfas = (projectId, rows) =>
  fetch(`/api/projects/${projectId}/afas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  }).then(json);

export const deleteAfas = (projectId) =>
  fetch(`/api/projects/${projectId}/afas`, { method: "DELETE" }).then(json);

// Stats
export const fetchStats = () => fetch("/api/stats").then(json);
