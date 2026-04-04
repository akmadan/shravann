"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getAgent,
  listParticipants,
  listProjects,
  type Agent,
  type Participant,
  type Project,
} from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";
import AgentBuilder from "@/components/agent-builder";

export default function AgentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <AgentDetailLoader />
    </Suspense>
  );
}

function AgentDetailLoader() {
  const { id } = useParams<{ id: string }>();
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready || !backendUser || !id) return;
    Promise.all([
      getAgent(id),
      listParticipants(id),
      listProjects(),
    ])
      .then(([a, pRes, projRes]) => {
        setAgent(a);
        setParticipants(pRes.participants ?? []);
        setProjects(projRes.projects ?? []);
      })
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [ready, id]);

  if (userLoading || loading) return <Spinner />;
  if (syncError) return <SyncError />;
  if (!backendUser) return <Spinner />;
  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717a]">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <AgentBuilder
          projects={projects}
          preselectedProject={agent.project_id}
          agentId={agent.id}
          initialAgent={agent}
          initialParticipants={participants}
        />
      </div>
    </div>
  );
}
