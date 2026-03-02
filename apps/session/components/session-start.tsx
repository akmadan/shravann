"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SessionProvider,
  useSession,
  useSessionContext,
} from "@livekit/components-react";
import { TokenSource } from "livekit-client";
import {
  getAgent,
  getFormById,
  startSession,
  endSession,
  type AgentPublic,
  type FormPublic,
  type FormFieldPublic,
  type SessionStartResponse,
} from "@/lib/api";
import VoiceRoomUI from "@/components/voice-room";
import "@livekit/components-styles";

const LIVEKIT_WS_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
    : undefined;

/** Ref set right before session.start() so TokenSource can read form data */
type StartOptionsRef = {
  identity: string;
  session_start_data?: Record<string, string>;
} | null;

export default function SessionStart({ agentId }: { agentId: string }) {
  const [agent, setAgent] = useState<AgentPublic | null>(null);
  const [form, setForm] = useState<FormPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      setError("Missing agent");
      return;
    }
    getAgent(agentId)
      .then(async (a) => {
        setAgent(a);

        if (a.form_id) {
          try {
            const f = await getFormById(a.form_id);
            setForm(f);
            const initial: Record<string, string> = {};
            (f.fields ?? []).forEach((field) => {
              initial[field.key] = "";
            });
            setFormData(initial);
            return;
          } catch {
            // Fall through to legacy schema
          }
        }

        const initial: Record<string, string> = {};
        (a.session_start_input_schema ?? []).forEach((f) => {
          initial[f.key] = "";
        });
        setFormData(initial);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load agent")
      )
      .finally(() => setLoading(false));
  }, [agentId]);

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
        <p className="mt-2 text-sm text-zinc-400">
          {error ?? "Agent not found"}
        </p>
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

  if (!LIVEKIT_WS_URL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-lg font-medium text-amber-400">
          LiveKit not configured
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Add{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5">
            NEXT_PUBLIC_LIVEKIT_WS_URL
          </code>{" "}
          to{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5">
            apps/session/.env
          </code>{" "}
          (e.g. wss://your-project.livekit.cloud), then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <SessionStartWithLiveKit
      agentId={agentId}
      agent={agent}
      form={form}
      formData={formData}
      setFormData={setFormData}
      setError={setError}
    />
  );
}

/**
 * Renders only when LIVEKIT_WS_URL is set so we can safely use useSession with a valid TokenSource.
 */
function SessionStartWithLiveKit({
  agentId,
  agent,
  form,
  formData,
  setFormData,
  setError,
}: {
  agentId: string;
  agent: AgentPublic;
  form: FormPublic | null;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setError: (e: string | null) => void;
}) {
  const startOptionsRef = useRef<StartOptionsRef>(null);
  const lastSessionRef = useRef<SessionStartResponse["session"] | null>(null);
  const livekitUrl = LIVEKIT_WS_URL!;

  const tokenSource = useMemo(
    () =>
      TokenSource.custom(async (options) => {
        // Only fetch when user has clicked Start (startOptionsRef set). Avoids creating a session on mount (prepareConnection).
        const fromForm = startOptionsRef.current;
        if (!fromForm) {
          throw new Error(
            "Start the session first (token is only created when you click Start session)."
          );
        }
        const id = options.agentName;
        if (!id) throw new Error("agentName required");
        const identity =
          fromForm.identity ??
          options.participantIdentity ??
          options.participantName ??
          "user";
        const session_start_data = fromForm.session_start_data;
        const res = await startSession(id, {
          identity,
          channel: "voice",
          session_start_data:
            session_start_data &&
            Object.keys(session_start_data).length > 0
              ? session_start_data
              : undefined,
        });
        lastSessionRef.current = res.session;
        return {
          serverUrl: livekitUrl,
          roomName: res.room_name,
          participantToken: res.token,
          participantName: identity,
        };
      }),
    [livekitUrl]
  );

  const session = useSession(tokenSource, { agentName: agentId });

  const formFields = form?.fields ?? [];
  const legacySchema = agent.session_start_input_schema ?? [];
  const hasForm = formFields.length > 0;
  const hasLegacySchema = legacySchema.length > 0;
  const hasAnySchema = hasForm || hasLegacySchema;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identity = formData.name ?? formData.identity ?? "user";
    const session_start_data = hasAnySchema
      ? { ...formData }
      : (undefined as Record<string, string> | undefined);

    startOptionsRef.current = { identity, session_start_data };
    try {
      await session.start();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start session"
      );
      startOptionsRef.current = null;
    }
  };

  return (
    <SessionProvider session={session}>
      <SessionStartInner
        agent={agent}
        form={form}
        formData={formData}
        setFormData={setFormData}
        hasAnySchema={hasAnySchema}
        formFields={formFields}
        legacySchema={legacySchema}
        onSubmit={handleSubmit}
        lastSessionRef={lastSessionRef}
        onEnd={() => {
          lastSessionRef.current = null;
          startOptionsRef.current = null;
        }}
      />
    </SessionProvider>
  );
}

function SessionStartInner({
  agent,
  form,
  formData,
  setFormData,
  hasAnySchema,
  formFields,
  legacySchema,
  onSubmit,
  lastSessionRef,
  onEnd,
}: {
  agent: AgentPublic;
  form: FormPublic | null;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hasAnySchema: boolean;
  formFields: FormFieldPublic[];
  legacySchema: AgentPublic["session_start_input_schema"];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  lastSessionRef: React.MutableRefObject<SessionStartResponse["session"] | null>;
  onEnd: () => void;
}) {
  const { isConnected } = useSessionContext();
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (isConnected) {
    return (
      <VoiceRoomUI
        agentName={agent.name}
        lastSessionRef={lastSessionRef}
        onEnd={onEnd}
      />
    );
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-lg font-medium text-white">{agent.name}</h1>
      {form?.description ? (
        <p className="mt-1 text-sm text-zinc-400">{form.description}</p>
      ) : (
        <p className="mt-1 text-sm text-zinc-400">Start a conversation</p>
      )}

      <form
        onSubmit={handleStart}
        className="mt-8 w-full max-w-sm space-y-4"
      >
        {formFields.length > 0
          ? formFields.map((field) => (
              <FormFieldInput
                key={field.key}
                field={field}
                value={formData[field.key] ?? ""}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, [field.key]: val }))
                }
              />
            ))
          : hasAnySchema
            ? legacySchema.map((field) => (
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
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    required={field.required}
                    className={inputClass}
                    placeholder={field.label}
                  />
                </div>
              ))
            : (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm text-zinc-300"
                  >
                    Your name (optional)
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={inputClass}
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

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormFieldPublic;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputClass =
    "w-full rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

  const minLength = field.validators?.find((v) => v.type === "min_length");
  const maxLength = field.validators?.find((v) => v.type === "max_length");
  const pattern = field.validators?.find((v) => v.type === "pattern");

  const options = field.config?.options ?? [];

  return (
    <div>
      <label htmlFor={field.key} className="mb-1 block text-sm text-zinc-300">
        {field.label}
        {field.required && <span className="text-red-400"> *</span>}
      </label>

      {field.type === "text" && (
        <input
          id={field.key}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          minLength={minLength ? Number(minLength.value) : undefined}
          maxLength={maxLength ? Number(maxLength.value) : undefined}
          pattern={pattern ? String(pattern.value) : undefined}
          className={inputClass}
          placeholder={field.label}
        />
      )}

      {field.type === "email" && (
        <input
          id={field.key}
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={field.label}
        />
      )}

      {field.type === "phone" && (
        <input
          id={field.key}
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
          placeholder={field.label}
        />
      )}

      {field.type === "boolean" && (
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="radio"
              name={field.key}
              value="yes"
              checked={value === "yes"}
              onChange={() => onChange("yes")}
              required={field.required && !value}
              className="border-zinc-600 bg-zinc-900 text-white"
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="radio"
              name={field.key}
              value="no"
              checked={value === "no"}
              onChange={() => onChange("no")}
              className="border-zinc-600 bg-zinc-900 text-white"
            />
            No
          </label>
        </div>
      )}

      {field.type === "select" && (
        <select
          id={field.key}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className={inputClass}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {field.type === "multi_select" && (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = value
              .split(",")
              .filter(Boolean)
              .includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    const current = value.split(",").filter(Boolean);
                    const next = e.target.checked
                      ? [...current, opt.value]
                      : current.filter((v) => v !== opt.value);
                    onChange(next.join(","));
                  }}
                  className="rounded border-zinc-600 bg-zinc-900 text-white"
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
