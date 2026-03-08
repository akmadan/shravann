"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bot, User, Clock, Hash, Radio } from "lucide-react";
import { getSession, type Session } from "@/lib/api";
import { Spinner } from "@/components/page-state";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const s = await getSession(id);
        setSession(s);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load session"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="mx-auto max-w-4xl pt-4">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!session) return null;

  const statusStyles: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400",
    ended: "bg-emerald-500/10 text-emerald-400",
    error: "bg-red-500/10 text-red-400",
  };

  const metadata = session.metadata as Record<string, unknown> | undefined;
  const formData =
    metadata && typeof metadata === "object"
      ? (metadata.session_start_data as Record<string, unknown> | undefined) ??
        metadata
      : null;

  const duration = (() => {
    if (!session.started_at) return null;
    const start = new Date(session.started_at).getTime();
    const end = session.ended_at
      ? new Date(session.ended_at).getTime()
      : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  })();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4 pb-12">
      {/* Back + Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push("/sessions")}
          className="flex items-center gap-1.5 text-sm text-[#71717a] transition-colors hover:text-white"
        >
          <ArrowLeft size={14} />
          Back to sessions
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
              Session
              <span className="font-mono text-sm text-[#71717a]">
                {session.id.slice(0, 8)}
              </span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#71717a]">
              <span className="flex items-center gap-1">
                <Radio size={13} />
                {session.channel}
              </span>
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {duration}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Hash size={13} />
                {session.agent_id.slice(0, 8)}
              </span>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusStyles[session.status] ?? "bg-white/[0.04] text-[#52525b]"
            }`}
          >
            {session.status}
          </span>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex gap-6 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[13px]">
        <div>
          <span className="text-[#52525b]">Started</span>
          <p className="text-[#a1a1aa]">
            {new Date(session.started_at).toLocaleString()}
          </p>
        </div>
        {session.ended_at && (
          <div>
            <span className="text-[#52525b]">Ended</span>
            <p className="text-[#a1a1aa]">
              {new Date(session.ended_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Form Data */}
      {formData && Object.keys(formData).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white">Form Data</h2>
          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-2.5 font-medium text-[#71717a]">
                    Field
                  </th>
                  <th className="px-4 py-2.5 font-medium text-[#71717a]">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {Object.entries(formData).map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#a1a1aa]">
                      {key}
                    </td>
                    <td className="px-4 py-2.5 text-white">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-white">Transcript</h2>
        {(!session.transcripts || session.transcripts.length === 0) && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-16">
            <p className="text-sm text-[#52525b]">
              No transcript available for this session.
            </p>
          </div>
        )}
        {session.transcripts && session.transcripts.length > 0 && (
          <div className="space-y-2 rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
            {session.transcripts.map((t) => {
              const isUser = t.role === "user";
              return (
                <div
                  key={t.id}
                  className={`flex items-start gap-2.5 ${
                    isUser ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      isUser
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {isUser ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                      isUser
                        ? "bg-blue-500/10 text-blue-100"
                        : "bg-white/[0.04] text-[#d4d4d8]"
                    }`}
                  >
                    {t.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
