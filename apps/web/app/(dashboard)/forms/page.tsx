"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, ArrowRight } from "lucide-react";
import { listProjects, listForms, type Form } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

interface FormWithProject extends Form {
  projectName: string;
}

export default function FormsPage() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [forms, setForms] = useState<FormWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const { projects } = await listProjects();
        const all: FormWithProject[] = [];
        for (const p of projects ?? []) {
          const { forms: pForms } = await listForms(p.id);
          for (const f of pForms ?? []) {
            all.push({ ...f, projectName: p.name });
          }
        }
        setForms(all);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load forms");
      } finally {
        setLoading(false);
      }
    })();
  }, [ready]);

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Forms
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Reusable form templates for session start screens.
          </p>
        </div>
        <Link
          href="/forms/new"
          className="flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
        >
          <Plus size={14} />
          New Form
        </Link>
      </div>

      {loading && <Spinner />}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && forms.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
            <FileText size={20} className="text-[#3f3f46]" />
          </div>
          <p className="text-sm font-medium text-[#a1a1aa]">No forms yet</p>
          <p className="mt-1 text-xs text-[#52525b]">
            Create a form template to use in your agents.
          </p>
          <Link
            href="/forms/new"
            className="mt-5 flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
          >
            <Plus size={14} />
            Create Form
          </Link>
        </div>
      )}

      {!loading && forms.length > 0 && (
        <div className="divide-y divide-white/[0.04] rounded-lg border border-white/[0.06]">
          {forms.map((f) => (
            <Link
              key={f.id}
              href={`/forms/${f.id}`}
              className="group flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.06]">
                  <FileText size={16} className="text-[#a1a1aa]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{f.name}</p>
                  <p className="text-xs text-[#52525b]">
                    {f.projectName}
                    {f.fields?.length
                      ? ` · ${f.fields.length} field${f.fields.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-[#3f3f46] transition-colors group-hover:text-[#71717a]"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
