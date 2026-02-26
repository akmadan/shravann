"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Bot,
  Users,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  getProject,
  listAgents,
  listMembers,
  removeMember,
  updateMemberRole,
  type Project,
  type Agent,
  type Member,
} from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

type Tab = "agents" | "members";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>("agents");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !id) return;
    setLoading(true);
    Promise.all([
      getProject(id, backendUser!.id),
      listAgents(id, backendUser!.id),
      listMembers(id, backendUser!.id),
    ])
      .then(([p, a, m]) => {
        setProject(p);
        setAgents(a.agents ?? []);
        setMembers(m.members ?? []);
      })
      .finally(() => setLoading(false));
  }, [ready, backendUser, id]);

  const handleRoleChange = async (memberId: string, role: string) => {
    if (!backendUser?.id) return;
    await updateMemberRole(id, memberId, role, backendUser.id);
    const m = await listMembers(id, backendUser.id);
    setMembers(m.members ?? []);
  };

  const handleRemove = async (memberId: string) => {
    if (!backendUser?.id) return;
    await removeMember(id, memberId, backendUser.id);
    setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
  };

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;
  if (loading) return <Spinner />;

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717a]">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[13px] text-[#71717a] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {project.name}
          </h1>
          <p className="mt-0.5 text-sm text-[#52525b]">/{project.slug}</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-white/[0.06]">
        {(["agents", "members"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              tab === t
                ? "border-white text-white"
                : "border-transparent text-[#52525b] hover:text-[#a1a1aa]"
            }`}
          >
            {t === "agents" ? <Bot size={14} /> : <Users size={14} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-[#71717a]">
              {t === "agents" ? agents.length : members.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "agents" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href={`/agents/new?project=${id}`}
              className="flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              <Plus size={14} />
              New Agent
            </Link>
          </div>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                <Bot size={20} className="text-[#3f3f46]" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">
                No agents in this project
              </p>
              <Link
                href={`/agents/new?project=${id}`}
                className="mt-4 text-[13px] text-[#71717a] hover:text-white"
              >
                Create your first agent
              </Link>
            </div>
          ) : (
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
                      <p className="text-sm font-medium text-white">
                        {a.name}
                      </p>
                      <p className="text-xs text-[#52525b]">
                        {a.model} &middot; {a.language}
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
      )}

      {tab === "members" && (
        <div className="space-y-0 divide-y divide-white/[0.04] rounded-lg border border-white/[0.06]">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                <Users size={20} className="text-[#3f3f46]" />
              </div>
              <p className="text-sm font-medium text-[#a1a1aa]">
                No members yet
              </p>
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-medium text-[#a1a1aa]">
                    {(m.name ?? m.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {m.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-[#52525b]">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      handleRoleChange(m.user_id, e.target.value)
                    }
                    className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    className="rounded-md p-1.5 text-[#52525b] transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
