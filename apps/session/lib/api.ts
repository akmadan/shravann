const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface SessionStartField {
  key: string;
  label: string;
  type?: "string" | "number" | "boolean";
  required?: boolean;
}

export interface AgentPublic {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  session_start_input_schema: SessionStartField[];
}

export interface SessionStartResponse {
  session: {
    id: string;
    agent_id: string;
    channel: string;
    status: string;
    started_at: string;
    created_at: string;
  };
  room_name: string;
  token: string;
}

export function getAgent(agentId: string): Promise<AgentPublic> {
  return request<AgentPublic>(`/agents/${agentId}`);
}

export function startSession(
  agentId: string,
  body: {
    identity?: string;
    channel?: "voice" | "chat";
    session_start_data?: Record<string, string>;
  }
): Promise<SessionStartResponse> {
  return request<SessionStartResponse>(`/agents/${agentId}/sessions/start`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function endSession(sessionId: string): Promise<{ id: string; status: string }> {
  return request<{ id: string; status: string }>(`/sessions/${sessionId}/end`, {
    method: "POST",
  });
}
