const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(
  path: string,
  opts: RequestInit & { userId?: string } = {}
): Promise<T> {
  const { userId, ...init } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (userId) headers["X-User-ID"] = userId;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Auth ---

export function syncUser(data: {
  email: string;
  name: string;
  auth_provider: string;
  auth_provider_id: string;
  avatar_url?: string;
}) {
  return request<User>("/auth/sync", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Users ---

export function createUser(data: {
  email: string;
  name: string;
  auth_provider: string;
  auth_provider_id: string;
  avatar_url?: string;
}) {
  return request<User>("/users", { method: "POST", body: JSON.stringify(data) });
}

export function getUser(id: string) {
  return request<User>(`/users/${id}`);
}

// --- Projects ---

export function listProjects(userId: string) {
  return request<{ projects: Project[] }>("/projects", { userId });
}

export function getProject(id: string, userId: string) {
  return request<Project>(`/projects/${id}`, { userId });
}

export function createProject(
  data: { name: string; slug: string },
  userId: string
) {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
    userId,
  });
}

export function updateProject(
  id: string,
  data: { name?: string; slug?: string },
  userId: string
) {
  return request<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    userId,
  });
}

export function deleteProject(id: string, userId: string) {
  return request<null>(`/projects/${id}`, { method: "DELETE", userId });
}

// --- Members ---

export function listMembers(projectId: string, userId: string) {
  return request<{ members: Member[] }>(`/projects/${projectId}/members`, {
    userId,
  });
}

export function addMember(
  projectId: string,
  data: { user_id: string; role?: string },
  userId: string
) {
  return request<Member>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
    userId,
  });
}

export function updateMemberRole(
  projectId: string,
  memberId: string,
  role: string,
  userId: string
) {
  return request<Member>(`/projects/${projectId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
    userId,
  });
}

export function removeMember(
  projectId: string,
  memberId: string,
  userId: string
) {
  return request<null>(`/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
    userId,
  });
}

// --- Agents ---

export function listAgents(projectId: string, userId: string) {
  return request<{ agents: Agent[] }>(`/projects/${projectId}/agents`, {
    userId,
  });
}

export function getAgent(id: string) {
  return request<Agent>(`/agents/${id}`);
}

export function createAgent(
  projectId: string,
  data: {
    name: string;
    slug: string;
    system_prompt?: string;
    model?: string;
    voice_provider?: string;
    language?: string;
  },
  userId: string
) {
  return request<Agent>(`/projects/${projectId}/agents`, {
    method: "POST",
    body: JSON.stringify(data),
    userId,
  });
}

export function updateAgent(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    system_prompt: string;
    model: string;
    voice_provider: string;
    language: string;
    is_active: boolean;
  }>
) {
  return request<Agent>(`/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAgent(id: string) {
  return request<null>(`/agents/${id}`, { method: "DELETE" });
}

// --- Sessions ---

export function listSessions(
  agentId: string,
  params?: { limit?: number; offset?: number }
) {
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString() ? `?${q}` : "";
  return request<{ sessions: Session[] }>(`/agents/${agentId}/sessions${qs}`);
}

export function getSession(id: string) {
  return request<Session>(`/sessions/${id}`);
}

export function endSession(id: string) {
  return request<Session>(`/sessions/${id}/end`, { method: "POST" });
}

// --- Types ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  auth_provider: string;
  auth_provider_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export interface Agent {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  system_prompt: string;
  model: string;
  voice_provider?: string;
  voice_config?: Record<string, unknown>;
  language: string;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  agent_id: string;
  external_user_id?: string;
  channel: string;
  status: string;
  metadata?: Record<string, unknown>;
  started_at: string;
  ended_at?: string;
  created_at: string;
}
