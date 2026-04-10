"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import {
  listProjects,
  listAgents,
  listSessions,
  type Session,
  type Agent,
} from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

interface SessionWithAgent extends Session {
  agentName: string;
}

export default function SessionsPage() {
  const { userLoading, syncError, ready } = usePageReady();
  const [sessions, setSessions] = useState<SessionWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const { projects } = await listProjects();
        const agentMap = new Map<string, string>();
        const allAgents: Agent[] = [];
        for (const p of projects ?? []) {
          const { agents } = await listAgents(p.id);
          for (const a of agents ?? []) {
            agentMap.set(a.id, a.name);
            allAgents.push(a);
          }
        }
        const all: SessionWithAgent[] = [];
        for (const a of allAgents) {
          const { sessions: aSessions } = await listSessions(a.id, {
            limit: 50,
          });
          for (const s of aSessions ?? []) {
            all.push({
              ...s,
              agentName: agentMap.get(s.agent_id) ?? "Unknown",
            });
          }
        }
        all.sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
        setSessions(all);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load sessions"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-blue-500/10 text-blue-400",
      ended: "bg-emerald-500/10 text-emerald-400",
      error: "bg-red-500/10 text-red-400",
    };
    return styles[status] ?? "bg-white/[0.04] text-[#52525b]";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Sessions
        </h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Conversation sessions are created automatically when users interact
          with your agents.
        </p>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
            <MessageSquare size={20} className="text-[#3f3f46]" />
          </div>
          <p className="text-sm font-medium text-[#a1a1aa]">
            No sessions yet
          </p>
          <p className="mt-1 text-xs text-[#52525b]">
            Sessions will appear here when users start conversations.
          </p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/[0.06]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-2.5 font-medium text-[#71717a]">ID</th>
                <th className="px-4 py-2.5 font-medium text-[#71717a]">
                  Agent
                </th>
                <th className="px-4 py-2.5 font-medium text-[#71717a]">
                  Channel
                </th>
                <th className="px-4 py-2.5 font-medium text-[#71717a]">
                  Status
                </th>
                <th className="px-4 py-2.5 font-medium text-[#71717a]">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sessions/${s.id}`}
                      className="font-mono text-xs text-[#a1a1aa] hover:text-white"
                    >
                      {s.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white">{s.agentName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-[#71717a]">
                      {s.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(s.status)}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#52525b]">
                    {new Date(s.started_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
