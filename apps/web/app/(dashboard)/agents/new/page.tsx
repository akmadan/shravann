"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listProjects, type Project } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";
import AgentBuilder from "@/components/agent-builder";

export default function NewAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <NewAgentLoader />
    </Suspense>
  );
}

function NewAgentLoader() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("project") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    listProjects(backendUser!.id)
      .then((res) => setProjects(res.projects ?? []))
      .finally(() => setLoading(false));
  }, [ready, backendUser]);

  if (userLoading || loading) return <Spinner />;
  if (syncError) return <SyncError />;
  if (!backendUser) return <Spinner />;

  return (
    <AgentBuilder
      projects={projects}
      preselectedProject={preselectedProject}
      userId={backendUser.id}
    />
  );
}
