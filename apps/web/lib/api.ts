const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
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

export function listProjects() {
  return request<{ projects: Project[] }>("/projects");
}

export function getProject(id: string) {
  return request<Project>(`/projects/${id}`);
}

export function createProject(data: { name: string; slug: string }) {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProject(
  id: string,
  data: { name?: string; slug?: string }
) {
  return request<Project>(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProject(id: string) {
  return request<null>(`/projects/${id}`, { method: "DELETE" });
}

// --- Members ---

export function listMembers(projectId: string) {
  return request<{ members: Member[] }>(`/projects/${projectId}/members`);
}

export function addMember(
  projectId: string,
  data: { user_id: string; role?: string }
) {
  return request<Member>(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMemberRole(
  projectId: string,
  memberId: string,
  role: string
) {
  return request<Member>(`/projects/${projectId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(projectId: string, memberId: string) {
  return request<null>(`/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
  });
}

// --- Agents ---

export function listAgents(projectId: string) {
  return request<{ agents: Agent[] }>(`/projects/${projectId}/agents`);
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
    session_start_input_schema?: SessionStartField[];
    form_id?: string;
  }
) {
  return request<Agent>(`/projects/${projectId}/agents`, {
    method: "POST",
    body: JSON.stringify(data),
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
    session_start_input_schema: SessionStartField[];
    form_id: string;
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

// --- Participants ---

export function listParticipants(agentId: string) {
  return request<{ participants: Participant[] }>(
    `/agents/${agentId}/participants`
  );
}

export function createParticipant(
  agentId: string,
  data: {
    name: string;
    role: string;
    system_prompt?: string;
    model?: string;
    voice_provider?: string;
    voice_id?: string;
    handoff_description?: string;
    is_entry_point?: boolean;
    position?: number;
    parent_participant_ids?: string[];
  }
) {
  return request<Participant>(`/agents/${agentId}/participants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateParticipant(
  agentId: string,
  participantId: string,
  data: Partial<{
    name: string;
    role: string;
    system_prompt: string;
    model: string;
    voice_provider: string;
    voice_id: string;
    handoff_description: string;
    is_entry_point: boolean;
    position: number;
    parent_participant_ids: string[];
  }>
) {
  return request<Participant>(
    `/agents/${agentId}/participants/${participantId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export function deleteParticipant(agentId: string, participantId: string) {
  return request<null>(`/agents/${agentId}/participants/${participantId}`, {
    method: "DELETE",
  });
}

// --- Forms ---

export function listForms(projectId: string) {
  return request<{ forms: Form[] }>(`/projects/${projectId}/forms`);
}

export function getForm(id: string) {
  return request<Form>(`/forms/${id}`);
}

export function createForm(
  projectId: string,
  data: {
    name: string;
    slug: string;
    description?: string;
    fields?: FormFieldDraft[];
  }
) {
  return request<Form>(`/projects/${projectId}/forms`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateForm(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    fields?: FormFieldDraft[];
  }
) {
  return request<Form>(`/forms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteForm(id: string) {
  return request<null>(`/forms/${id}`, { method: "DELETE" });
}

// --- Project API Keys ---

export interface APIKeyEntry {
  provider: string;
  is_set: boolean;
  masked: string;
}

export function listAPIKeys(projectId: string) {
  return request<{ api_keys: APIKeyEntry[] }>(
    `/projects/${projectId}/api-keys`
  );
}

export function upsertAPIKey(
  projectId: string,
  provider: string,
  key: string
) {
  return request<APIKeyEntry>(`/projects/${projectId}/api-keys`, {
    method: "PUT",
    body: JSON.stringify({ provider, key }),
  });
}

export function deleteAPIKey(projectId: string, provider: string) {
  return request<{ deleted: boolean }>(
    `/projects/${projectId}/api-keys/${provider}`,
    { method: "DELETE" }
  );
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
  auth_provider?: string;
  auth_provider_id?: string;
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

export interface SessionStartField {
  key: string;
  label: string;
  type?: "string" | "number" | "boolean";
  required?: boolean;
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
  session_start_input_schema?: SessionStartField[];
  form_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  agent_id: string;
  parent_participant_ids: string[];
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  voice_provider?: string;
  voice_id?: string;
  voice_config?: Record<string, unknown>;
  handoff_description: string;
  is_entry_point: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SessionTranscript {
  id: string;
  session_id: string;
  role: "agent" | "user";
  content: string;
  position: number;
  created_at: string;
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
  transcripts?: SessionTranscript[];
}

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "boolean"
  | "select"
  | "multi_select";

export interface FormFieldValidator {
  type: "min_length" | "max_length" | "pattern";
  value: string | number;
}

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  options?: FormFieldOption[];
}

export interface FormField {
  id: string;
  form_id: string;
  key: string;
  label: string;
  type: FormFieldType;
  config: FormFieldConfig;
  validators: FormFieldValidator[];
  required: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface FormFieldDraft {
  key: string;
  label: string;
  type: FormFieldType;
  config?: FormFieldConfig;
  validators?: FormFieldValidator[];
  required: boolean;
  position: number;
}

export interface Form {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string;
  fields?: FormField[];
  created_by: string;
  created_at: string;
  updated_at: string;
}
