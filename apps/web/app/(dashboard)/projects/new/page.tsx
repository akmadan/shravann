"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createProject } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

export default function NewProjectPage() {
  const { backendUser, userLoading, syncError } = usePageReady();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("User not loaded yet. Please wait a moment and try again.");
      return;
    }
    if (!name || !slug) return;
    setLoading(true);
    setError("");
    try {
      await createProject({ name, slug }, backendUser.id);
      router.push("/projects");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create project"
      );
    } finally {
      setLoading(false);
    }
  };

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
          Create Project
        </h1>
        <p className="mt-1 text-sm text-[#71717a]">
          A project groups your agents and team members.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-[#a1a1aa]">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Project"
            required
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none transition focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
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
            placeholder="my-project"
            required
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none transition focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08]"
          />
          <p className="mt-1.5 text-xs text-[#52525b]">
            URL-friendly identifier. Auto-generated from name.
          </p>
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
            {loading ? "Creating..." : "Create Project"}
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
