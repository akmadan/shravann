"use client";

import { useEffect, useState } from "react";
import {
  getAgent,
  startSession,
  type AgentPublic,
  type SessionStartResponse,
} from "@/lib/api";
import VoiceRoomView from "@/components/voice-room";

export default function SessionStart({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AgentPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startResult, setStartResult] = useState<SessionStartResponse | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      setError("Missing agent");
      return;
    }
    getAgent(agentId)
      .then((a) => {
        setAgent(a);
        const initial: Record<string, string> = {};
        (a.session_start_input_schema ?? []).forEach((f) => {
          initial[f.key] = "";
        });
        setFormData(initial);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load agent"))
      .finally(() => setLoading(false));
  }, [agentId]);

  const schema = agent?.session_start_input_schema ?? [];
  const hasSchema = schema.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || submitting) return;
    setSubmitting(true);
    const identity = formData.name ?? formData.identity ?? "user";
    const session_start_data = hasSchema
      ? { ...formData }
      : (undefined as Record<string, string> | undefined);
    startSession(agentId, {
      identity,
      channel: "voice",
      session_start_data: session_start_data && Object.keys(session_start_data).length ? session_start_data : undefined,
    })
      .then(setStartResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to start session"))
      .finally(() => setSubmitting(false));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
        <p className="mt-3 text-sm text-zinc-400">Loading agent…</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-lg font-medium text-red-400">Cannot start session</h1>
        <p className="mt-2 text-sm text-zinc-400">{error ?? "Agent not found"}</p>
      </div>
    );
  }

  if (!agent.is_active) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <h1 className="text-lg font-medium text-amber-400">Agent inactive</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This agent is not available for sessions right now.
        </p>
      </div>
    );
  }

  const livekitUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LIVEKIT_WS_URL : undefined;

  if (startResult && agent) {
    if (!livekitUrl) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <h1 className="text-lg font-medium text-amber-400">LiveKit not configured</h1>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Add <code className="rounded bg-zinc-800 px-1.5 py-0.5">NEXT_PUBLIC_LIVEKIT_WS_URL</code> to <code className="rounded bg-zinc-800 px-1.5 py-0.5">apps/session/.env</code> (same URL as your API/worker, e.g. <code className="break-all text-xs">wss://your-project.livekit.cloud</code>), then restart the dev server.
          </p>
          <p className="mt-4 text-xs text-zinc-500">Session ID: {startResult.session.id}</p>
          <button
            type="button"
            onClick={() => setStartResult(null)}
            className="mt-6 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Back to form
          </button>
        </div>
      );
    }
    return (
      <VoiceRoomView
        startResult={startResult}
        livekitUrl={livekitUrl}
        agentName={agent.name}
        onCallEnded={() => setStartResult(null)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-lg font-medium text-white">{agent.name}</h1>
      <p className="mt-1 text-sm text-zinc-400">Start a conversation</p>

      {!livekitUrl && (
        <p className="mt-4 max-w-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
          Voice room requires <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_LIVEKIT_WS_URL</code> in <code className="rounded bg-amber-500/20 px-1">.env</code>. You can still start a session; add the URL and refresh to join the call.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-sm space-y-4"
      >
        {hasSchema ? (
          schema.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={field.key}
                className="mb-1 block text-sm text-zinc-300"
              >
                {field.label}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              <input
                id={field.key}
                type={field.type === "number" ? "number" : "text"}
                value={formData[field.key] ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                required={field.required}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder={field.label}
              />
            </div>
          ))
        ) : (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-zinc-300">
              Your name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={formData.name ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              placeholder="Your name"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start session"}
        </button>
      </form>
    </div>
  );
}
