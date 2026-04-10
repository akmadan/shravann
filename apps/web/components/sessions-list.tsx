"use client";

import { useEffect, useState } from "react";
import { listSessions, type Session } from "@/lib/api";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatDuration(started: string, ended?: string | null): string {
  try {
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const ms = Math.max(0, end - start);
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  } catch {
    return "—";
  }
}

export default function SessionsList({ agentId }: { agentId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    listSessions(agentId, { limit: 20 })
      .then((res) => {
        if (!cancelled) setSessions(res.sessions ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#27272a] border-t-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-red-400">{error}</div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[#71717a]">
        No sessions yet. Share the session link to start a call.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#27272a] text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
            <th className="py-2.5 pr-4">Status</th>
            <th className="py-2.5 pr-4">Started</th>
            <th className="py-2.5 pr-4">Ended</th>
            <th className="py-2.5">Duration</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr
              key={s.id}
              className="border-b border-[#27272a]/60 text-[#a1a1aa]"
            >
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    s.status === "active"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : s.status === "ended"
                        ? "bg-zinc-600/50 text-zinc-400"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="py-2.5 pr-4">{formatDate(s.started_at)}</td>
              <td className="py-2.5 pr-4">
                {s.ended_at ? formatDate(s.ended_at) : "—"}
              </td>
              <td className="py-2.5">
                {formatDuration(s.started_at, s.ended_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
