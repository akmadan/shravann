"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Globe, Cpu, Power, Volume2 } from "lucide-react";
import { getAgent, updateAgent, deleteAgent, type Agent } from "@/lib/api";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgent(id)
      .then(setAgent)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleActive = async () => {
    if (!agent) return;
    const updated = await updateAgent(id, { is_active: !agent.is_active });
    setAgent(updated);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    await deleteAgent(id);
    router.push("/agents");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#71717a]">Agent not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-[#71717a] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {agent.name}
          </h1>
          <p className="mt-0.5 text-sm text-[#52525b]">/{agent.slug}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleActive}
            className="rounded-md bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-[#a1a1aa] transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            {agent.is_active ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md bg-red-500/10 px-3 py-1.5 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Model", value: agent.model, icon: Cpu },
          { label: "Language", value: agent.language, icon: Globe },
          {
            label: "Status",
            value: agent.is_active ? "Active" : "Inactive",
            icon: Power,
          },
          {
            label: "Voice",
            value: agent.voice_provider ?? "None",
            icon: Volume2,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[#71717a]">
              <card.icon size={13} />
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className="text-sm font-medium text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
          System Prompt
        </h3>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#a1a1aa]">
          {agent.system_prompt || "No system prompt configured."}
        </pre>
      </div>
    </div>
  );
}
