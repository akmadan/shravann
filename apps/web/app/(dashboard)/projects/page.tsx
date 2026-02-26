"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, ArrowRight } from "lucide-react";
import { listProjects, type Project } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

export default function ProjectsPage() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    listProjects(backendUser!.id)
      .then((res) => setProjects(res.projects ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ready, backendUser]);

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Manage your projects and team members.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          <Plus size={14} />
          New Project
        </Link>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
            <FolderKanban size={20} className="text-[#3f3f46]" />
          </div>
          <p className="text-sm font-medium text-[#a1a1aa]">No projects yet</p>
          <p className="mt-1 text-xs text-[#52525b]">
            Create a project to get started with agents.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            <Plus size={14} />
            Create Project
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="divide-y divide-white/[0.04] rounded-lg border border-white/[0.06]">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06] text-sm font-medium text-[#a1a1aa]">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-[#52525b]">/{p.slug}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#52525b]">
                  {new Date(p.created_at).toLocaleDateString()}
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
