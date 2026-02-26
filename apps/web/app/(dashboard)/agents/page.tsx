"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Bot, ArrowRight } from "lucide-react";
import { listProjects, listAgents, type Agent } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

interface AgentWithProject extends Agent {
  projectName: string;
}

export default function AgentsPage() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [agents, setAgents] = useState<AgentWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const { projects } = await listProjects(backendUser!.id);
        const all: AgentWithProject[] = [];
        for (const p of projects ?? []) {
          const { agents: pAgents } = await listAgents(p.id, backendUser!.id);
          for (const a of pAgents ?? []) {
            all.push({ ...a, projectName: p.name });
          }
        }
        setAgents(all);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, backendUser]);

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Agents
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            All AI agents across your projects.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          <Plus size={14} />
          New Agent
        </Link>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
            <Bot size={20} className="text-[#3f3f46]" />
          </div>
          <p className="text-sm font-medium text-[#a1a1aa]">No agents yet</p>
          <p className="mt-1 text-xs text-[#52525b]">
            Create an agent inside a project to get started.
          </p>
          <Link
            href="/agents/new"
            className="mt-5 flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            <Plus size={14} />
            Create Agent
          </Link>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <div className="divide-y divide-white/[0.04] rounded-lg border border-white/[0.06]">
          {agents.map((a) => (
            <Link
              key={a.id}
              href={`/agents/${a.id}`}
              className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06]">
                  <Bot size={16} className="text-[#a1a1aa]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{a.name}</p>
                  <p className="text-xs text-[#52525b]">
                    {a.projectName} &middot; {a.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    a.is_active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-white/[0.04] text-[#52525b]"
                  }`}
                >
                  {a.is_active ? "Active" : "Inactive"}
                </span>
                <ArrowRight
                  size={14}
                  className="text-[#3f3f46] transition-colors group-hover:text-[#71717a]"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
