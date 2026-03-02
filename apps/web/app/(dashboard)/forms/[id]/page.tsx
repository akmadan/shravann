"use client";

import { use, useEffect, useState } from "react";
import { listProjects, getForm, type Project, type Form } from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";
import FormBuilder from "@/components/form-builder";

export default function EditFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      listProjects(backendUser!.id).then((r) => r.projects ?? []),
      getForm(id),
    ])
      .then(([p, f]) => {
        setProjects(p);
        setForm(f);
      })
      .finally(() => setLoading(false));
  }, [ready, backendUser, id]);

  if (userLoading || loading) return <Spinner />;
  if (syncError) return <SyncError />;
  if (!backendUser) return <Spinner />;

  return (
    <FormBuilder
      projects={projects}
      preselectedProject=""
      userId={backendUser.id}
      formId={id}
      initialForm={form}
    />
  );
}
