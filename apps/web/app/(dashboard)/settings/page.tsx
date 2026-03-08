"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Key,
  Check,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  listProjects,
  listAPIKeys,
  upsertAPIKey,
  deleteAPIKey,
  type Project,
  type APIKeyEntry,
} from "@/lib/api";
import { Spinner, SyncError, usePageReady } from "@/components/page-state";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Realtime voice agents via OpenAI Realtime API",
    required: false,
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "Realtime voice agents via Gemini Live API",
    required: false,
  },
];

function ProviderCard({
  provider,
  entry,
  onSave,
  onDelete,
  saving,
}: {
  provider: (typeof PROVIDERS)[number];
  entry: APIKeyEntry | undefined;
  onSave: (provider: string, key: string) => Promise<void>;
  onDelete: (provider: string) => Promise<void>;
  saving: boolean;
}) {
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(false);
  const isSet = entry?.is_set ?? false;

  const handleSave = async () => {
    if (!keyValue.trim()) return;
    await onSave(provider.id, keyValue.trim());
    setKeyValue("");
    setEditing(false);
    setShowKey(false);
  };

  const handleDelete = async () => {
    await onDelete(provider.id);
    setKeyValue("");
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isSet
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/[0.04] text-[#52525b]"
            }`}
          >
            {isSet ? <Check size={16} /> : <Key size={16} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white">
                {provider.name}
              </h3>
              {provider.required && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  Required
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#52525b]">
              {provider.description}
            </p>
            {isSet && !editing && (
              <p className="mt-1.5 font-mono text-xs text-[#71717a]">
                {entry?.masked}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isSet && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md px-2.5 py-1.5 text-xs text-[#71717a] transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                Update
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded-md p-1.5 text-[#52525b] transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!isSet && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.1]"
            >
              Configure
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={`Enter your ${provider.name} API key`}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 pr-10 font-mono text-xs text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#71717a]"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !keyValue.trim()}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save Key
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setKeyValue("");
                setShowKey(false);
              }}
              className="rounded-md px-3 py-1.5 text-xs text-[#71717a] transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { backendUser, userLoading, syncError, ready } = usePageReady();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [keysLoading, setKeysLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const { projects: p } = await listProjects(backendUser!.id);
        setProjects(p ?? []);
        if (p?.length) setSelectedProjectId(p[0].id);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load projects"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, backendUser]);

  const loadKeys = useCallback(async () => {
    if (!selectedProjectId || !backendUser) return;
    setKeysLoading(true);
    try {
      const { api_keys } = await listAPIKeys(
        selectedProjectId,
        backendUser.id
      );
      setApiKeys(api_keys ?? []);
    } catch {
      setApiKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, [selectedProjectId, backendUser]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleSave = async (provider: string, key: string) => {
    if (!backendUser || !selectedProjectId) return;
    setSaving(true);
    try {
      await upsertAPIKey(selectedProjectId, provider, key, backendUser.id);
      await loadKeys();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to save key"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!backendUser || !selectedProjectId) return;
    setSaving(true);
    try {
      await deleteAPIKey(selectedProjectId, provider, backendUser.id);
      await loadKeys();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete key"
      );
    } finally {
      setSaving(false);
    }
  };

  if (userLoading) return <Spinner />;
  if (syncError) return <SyncError />;

  const keyMap = new Map(apiKeys.map((k) => [k.provider, k]));
  const hasAnyProvider = PROVIDERS.some((p) => keyMap.get(p.id)?.is_set);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-4 pb-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Manage API keys for your AI providers. Keys are encrypted at rest.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] py-20">
          <p className="text-sm text-[#a1a1aa]">No projects found</p>
          <p className="mt-1 text-xs text-[#52525b]">
            Create a project first to configure API keys.
          </p>
        </div>
      ) : (
        <>
          {/* Project selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-[#52525b]">
              Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#18181b]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Missing provider warning */}
          {!keysLoading && !hasAnyProvider && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber-400"
              />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  No provider configured
                </p>
                <p className="mt-0.5 text-xs text-amber-400/70">
                  Configure at least one provider API key (OpenAI or Google
                  Gemini) for voice agents to work.
                </p>
              </div>
            </div>
          )}

          {/* Provider cards */}
          {keysLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-white">
                API Keys
              </h2>
              {PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  entry={keyMap.get(provider.id)}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
