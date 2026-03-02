"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  Save,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import {
  createForm,
  updateForm,
  type Project,
  type Form,
  type FormFieldType,
  type FormFieldDraft,
  type FormFieldOption,
  type FormFieldValidator,
  type FormFieldConfig,
} from "@/lib/api";

const INPUT =
  "w-full rounded-md border border-[#27272a] bg-[#09090b] px-3 py-2 text-sm text-white placeholder-[#52525b] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/30";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "boolean", label: "Yes / No" },
  { value: "select", label: "Single Select" },
  { value: "multi_select", label: "Multi Select" },
];

function makeSlug(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function makeKey(val: string) {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

interface FieldDraftLocal extends FormFieldDraft {
  _id: string;
}

function newField(position: number): FieldDraftLocal {
  return {
    _id: Math.random().toString(36).slice(2, 10),
    key: "",
    label: "",
    type: "text",
    config: {},
    validators: [],
    required: false,
    position,
  };
}

function fromApiFields(fields: Form["fields"]): FieldDraftLocal[] {
  if (!fields?.length) return [newField(0)];
  return fields.map((f) => ({
    _id: f.id,
    key: f.key,
    label: f.label,
    type: f.type,
    config: f.config ?? {},
    validators: f.validators ?? [],
    required: f.required,
    position: f.position,
  }));
}

export default function FormBuilder({
  projects,
  preselectedProject,
  userId,
  formId,
  initialForm,
}: {
  projects: Project[];
  preselectedProject: string;
  userId: string;
  formId?: string;
  initialForm?: Form | null;
}) {
  const router = useRouter();
  const isEditMode = Boolean(formId && initialForm);

  const [projectId, setProjectId] = useState(
    () => initialForm?.project_id || preselectedProject || projects[0]?.id || ""
  );
  const [name, setName] = useState(() => initialForm?.name ?? "");
  const [slug, setSlug] = useState(() => initialForm?.slug ?? "");
  const [description, setDescription] = useState(
    () => initialForm?.description ?? ""
  );
  const [fields, setFields] = useState<FieldDraftLocal[]>(() =>
    fromApiFields(initialForm?.fields)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = useCallback(
    (id: string, patch: Partial<FieldDraftLocal>) => {
      setFields((prev) =>
        prev.map((f) => (f._id === id ? { ...f, ...patch } : f))
      );
    },
    []
  );

  const removeField = useCallback((id: string) => {
    setFields((prev) => {
      const filtered = prev.filter((f) => f._id !== id);
      return filtered.map((f, i) => ({ ...f, position: i }));
    });
  }, []);

  const moveField = useCallback((id: string, direction: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f._id === id);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((f, i) => ({ ...f, position: i }));
    });
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [...prev, newField(prev.length)]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId) {
      setError("Select a project");
      return;
    }
    if (!name) {
      setError("Form name is required");
      return;
    }
    for (const f of fields) {
      if (!f.key || !f.label) {
        setError(`Field "${f.label || "(unnamed)"}" needs a key and label`);
        return;
      }
    }
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      setError("Field keys must be unique");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const fieldDrafts: FormFieldDraft[] = fields.map((f, i) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        config: f.config,
        validators: f.validators,
        required: f.required,
        position: i,
      }));

      if (isEditMode) {
        await updateForm(formId!, {
          name,
          slug,
          description,
          fields: fieldDrafts,
        });
        router.push(`/forms/${formId}`);
      } else {
        const form = await createForm(
          projectId,
          { name, slug, description, fields: fieldDrafts },
          userId
        );
        router.push(`/forms/${form.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  }, [
    isEditMode,
    formId,
    projectId,
    name,
    slug,
    description,
    fields,
    userId,
    router,
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#71717a] hover:text-white"
          >
            <ArrowLeft size={14} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {isEditMode ? `Edit: ${name || "Form"}` : "New Form"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-[13px] text-red-400">{error}</span>}
          {isEditMode && (
            <button
              onClick={async () => {
                if (!formId || !confirm("Delete this form?")) return;
                const { deleteForm: del } = await import("@/lib/api");
                await del(formId);
                router.push("/forms");
              }}
              className="rounded-md bg-red-500/10 px-3 py-1.5 text-[13px] font-medium text-red-400 hover:bg-red-500/20"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-white px-3.5 py-1.5 text-[13px] font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? "Saving..." : "Save Form"}
          </button>
        </div>
      </div>

      {/* Form metadata */}
      <div className="rounded-lg border border-[#27272a] bg-[#18181b]/50 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
              Form Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!isEditMode) setSlug(makeSlug(e.target.value));
              }}
              placeholder="Pre-call Intake"
              className={INPUT}
            />
            {slug && (
              <p className="mt-1 text-[10px] text-[#52525b]">slug: {slug}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isEditMode}
              className={INPUT}
            >
              <option value="">Select</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-[#71717a]">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown to users before starting a session"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">Fields</h2>
          <button
            onClick={addField}
            className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/[0.12]"
          >
            <Plus size={13} /> Add Field
          </button>
        </div>

        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-12">
            <p className="text-sm text-[#52525b]">No fields yet</p>
            <button
              onClick={addField}
              className="mt-3 flex items-center gap-1.5 rounded-md bg-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/[0.12]"
            >
              <Plus size={13} /> Add Field
            </button>
          </div>
        )}

        {fields.map((field, idx) => (
          <FieldEditor
            key={field._id}
            field={field}
            index={idx}
            total={fields.length}
            onUpdate={(patch) => updateField(field._id, patch)}
            onRemove={() => removeField(field._id)}
            onMove={(dir) => moveField(field._id, dir)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  field: FieldDraftLocal;
  index: number;
  total: number;
  onUpdate: (patch: Partial<FieldDraftLocal>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const hasOptions = field.type === "select" || field.type === "multi_select";
  const hasValidators = field.type === "text";
  const options: FormFieldOption[] = (field.config as FormFieldConfig)?.options ?? [];
  const validators: FormFieldValidator[] = field.validators ?? [];

  const setOptions = (opts: FormFieldOption[]) => {
    onUpdate({ config: { ...field.config, options: opts } });
  };

  const setValidators = (vals: FormFieldValidator[]) => {
    onUpdate({ validators: vals });
  };

  return (
    <div className="rounded-lg border border-[#27272a] bg-[#18181b]/50 p-4">
      <div className="flex items-start gap-3">
        {/* Reorder controls */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <GripVertical size={14} className="text-[#3f3f46]" />
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-[#52525b] hover:text-white disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-[#52525b] hover:text-white disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Row 1: label, key, type */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                Label
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => {
                  onUpdate({
                    label: e.target.value,
                    key: makeKey(e.target.value),
                  });
                }}
                placeholder="Full Name"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                Key
              </label>
              <input
                type="text"
                value={field.key}
                onChange={(e) => onUpdate({ key: makeKey(e.target.value) })}
                placeholder="full_name"
                className={`${INPUT} font-mono text-xs`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
                Type
              </label>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({
                    type: e.target.value as FormFieldType,
                    config: {},
                    validators: [],
                  })
                }
                className={INPUT}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: required toggle */}
          <label className="flex items-center gap-2 text-[12px] text-[#a1a1aa]">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="rounded border-[#27272a] bg-[#09090b] text-[#3b82f6] focus:ring-[#3b82f6]/30"
            />
            Required
          </label>

          {/* Options editor for select/multi_select */}
          {hasOptions && (
            <OptionsEditor options={options} onChange={setOptions} />
          )}

          {/* Validators for text fields */}
          {hasValidators && (
            <ValidatorsEditor
              validators={validators}
              onChange={setValidators}
            />
          )}
        </div>

        <button
          onClick={onRemove}
          className="mt-1 text-[#52525b] hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: FormFieldOption[];
  onChange: (opts: FormFieldOption[]) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
        Options
      </label>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={opt.label}
            onChange={(e) => {
              const updated = [...options];
              updated[i] = {
                label: e.target.value,
                value: makeKey(e.target.value),
              };
              onChange(updated);
            }}
            placeholder={`Option ${i + 1}`}
            className={`${INPUT} flex-1`}
          />
          <span className="text-[10px] text-[#52525b] font-mono min-w-[60px]">
            {opt.value || "—"}
          </span>
          <button
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="text-[#52525b] hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, { value: "", label: "" }])}
        className="flex items-center gap-1 text-[11px] text-[#71717a] hover:text-white"
      >
        <Plus size={11} /> Add option
      </button>
    </div>
  );
}

function ValidatorsEditor({
  validators,
  onChange,
}: {
  validators: FormFieldValidator[];
  onChange: (vals: FormFieldValidator[]) => void;
}) {
  const hasMinLength = validators.some((v) => v.type === "min_length");
  const hasMaxLength = validators.some((v) => v.type === "max_length");
  const hasPattern = validators.some((v) => v.type === "pattern");

  const toggle = (type: FormFieldValidator["type"], defaultValue: string | number) => {
    const exists = validators.find((v) => v.type === type);
    if (exists) {
      onChange(validators.filter((v) => v.type !== type));
    } else {
      onChange([...validators, { type, value: defaultValue }]);
    }
  };

  const updateVal = (type: FormFieldValidator["type"], value: string | number) => {
    onChange(validators.map((v) => (v.type === type ? { ...v, value } : v)));
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-medium uppercase tracking-wider text-[#71717a]">
        Validators
      </label>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
          <input
            type="checkbox"
            checked={hasMinLength}
            onChange={() => toggle("min_length", 1)}
            className="rounded border-[#27272a] bg-[#09090b] text-[#3b82f6]"
          />
          Min length
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
          <input
            type="checkbox"
            checked={hasMaxLength}
            onChange={() => toggle("max_length", 100)}
            className="rounded border-[#27272a] bg-[#09090b] text-[#3b82f6]"
          />
          Max length
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
          <input
            type="checkbox"
            checked={hasPattern}
            onChange={() => toggle("pattern", "")}
            className="rounded border-[#27272a] bg-[#09090b] text-[#3b82f6]"
          />
          Pattern (regex)
        </label>
      </div>
      {hasMinLength && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#71717a] w-20">Min length</span>
          <input
            type="number"
            min={0}
            value={validators.find((v) => v.type === "min_length")?.value ?? ""}
            onChange={(e) => updateVal("min_length", Number(e.target.value))}
            className={`${INPUT} w-24`}
          />
        </div>
      )}
      {hasMaxLength && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#71717a] w-20">Max length</span>
          <input
            type="number"
            min={0}
            value={validators.find((v) => v.type === "max_length")?.value ?? ""}
            onChange={(e) => updateVal("max_length", Number(e.target.value))}
            className={`${INPUT} w-24`}
          />
        </div>
      )}
      {hasPattern && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#71717a] w-20">Pattern</span>
          <input
            type="text"
            value={String(validators.find((v) => v.type === "pattern")?.value ?? "")}
            onChange={(e) => updateVal("pattern", e.target.value)}
            placeholder="^[A-Za-z]+$"
            className={`${INPUT} flex-1 font-mono text-xs`}
          />
        </div>
      )}
    </div>
  );
}
