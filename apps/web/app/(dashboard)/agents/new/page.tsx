"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listProjects, createAgent, type Project } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

export default function NewAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <NewAgentForm />
    </Suspense>
  );
}

function NewAgentForm() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("project") ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(preselectedProject);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    listProjects(backendUser!.id).then((res) => {
      setProjects(res.projects ?? []);
      if (!preselectedProject && res.projects?.length) {
        setProjectId(res.projects[0].id);
      }
    });
  }, [ready, backendUser, preselectedProject]);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendUser?.id) {
      setError("User not loaded yet. Please wait and try again.");
      return;
    }
    if (!projectId || !name || !slug) return;
    setLoading(true);
    setError("");
    try {
      await createAgent(
        projectId,
        { name, slug, system_prompt: systemPrompt, model, language },
        backendUser.id
      );
      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none transition focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]";

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  return (
    <div className="mx-auto max-w-md pt-4">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-[#71717a] transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Create Agent
        </h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Configure a new AI agent for your project.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>
              Select a project
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Customer Support Bot"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="customer-support-bot"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful assistant..."
            rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={inputClass}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[13px] text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="submit"
            disabled={loading || userLoading}
            className="rounded-md bg-white px-4 py-2 text-[13px] font-medium text-black transition-colors hover:bg-[#e4e4e7] disabled:opacity-40"
          >
            {loading ? "Creating..." : "Create Agent"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-[#a1a1aa] transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
