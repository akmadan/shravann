"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Key,
  Check,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Radio,
  Copy,
  CheckCircle2,
  Terminal,
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

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function ChangePasswordSection() {
  const searchParams = useSearchParams();
  const forced = searchParams.get("change_password") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${API}/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Failed to change password");
        return;
      }
      setPwSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Unable to reach the server");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock size={16} className="text-[#71717a]" />
        <h2 className="text-sm font-medium text-white">Change Password</h2>
      </div>

      {forced && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
          You must change your password before continuing.
        </div>
      )}

      <form
        onSubmit={handleChangePassword}
        className="space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-5"
      >
        {pwError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            {pwSuccess}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#a1a1aa]">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50"
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#a1a1aa]">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50"
            placeholder="At least 6 characters"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#a1a1aa]">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={pwSaving}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {pwSaving && <Loader2 size={12} className="animate-spin" />}
          Change Password
        </button>
      </form>
    </div>
  );
}

function LiveKitSetupSection() {
  const [livekitUrl, setLivekitUrl] = useState("");
  const [livekitApiKey, setLivekitApiKey] = useState("");
  const [livekitApiSecret, setLivekitApiSecret] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const allFilled =
    livekitUrl.trim() && livekitApiKey.trim() && livekitApiSecret.trim();

  const envSnippet = [
    `LIVEKIT_URL=${livekitUrl.trim()}`,
    `LIVEKIT_API_KEY=${livekitApiKey.trim()}`,
    `LIVEKIT_API_SECRET=${livekitApiSecret.trim()}`,
  ].join("\n");

  const fullCommand = allFilled
    ? `# Add to your .env file:\n${envSnippet}\n\n# Then start the voice worker:\ndocker compose --profile voice up -d`
    : "";

  const handleCopy = async () => {
    if (!fullCommand) return;
    await navigator.clipboard.writeText(fullCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio size={16} className="text-[#71717a]" />
        <h2 className="text-sm font-medium text-white">
          LiveKit Configuration
        </h2>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
        <p className="text-xs text-[#71717a]">
          LiveKit provides the real-time WebRTC transport for voice sessions.
          Get credentials at{" "}
          <a
            href="https://livekit.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            livekit.io
          </a>{" "}
          (free tier available). After entering your credentials, copy the
          generated command below.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#a1a1aa]">
              LiveKit URL
            </label>
            <input
              type="text"
              value={livekitUrl}
              onChange={(e) => setLivekitUrl(e.target.value)}
              placeholder="wss://your-project.livekit.cloud"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-xs text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#a1a1aa]">
                API Key
              </label>
              <input
                type="text"
                value={livekitApiKey}
                onChange={(e) => setLivekitApiKey(e.target.value)}
                placeholder="APIxxxxxxxx"
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-xs text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#a1a1aa]">
                API Secret
              </label>
              <div className="relative">
                <input
                  type={showSecrets ? "text" : "password"}
                  value={livekitApiSecret}
                  onChange={(e) => setLivekitApiSecret(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 pr-10 font-mono text-xs text-white placeholder-[#3f3f46] outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#71717a]"
                >
                  {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {allFilled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Terminal size={13} className="text-[#52525b]" />
                <span className="text-xs font-medium text-[#71717a]">
                  Setup command
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[#71717a] transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md border border-white/[0.06] bg-black/40 p-3 font-mono text-xs leading-relaxed text-[#a1a1aa]">
              {fullCommand}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { userLoading, syncError, ready } = usePageReady();
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
        const { projects: p } = await listProjects();
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
  }, [ready]);

  const loadKeys = useCallback(async () => {
    if (!selectedProjectId) return;
    setKeysLoading(true);
    try {
      const { api_keys } = await listAPIKeys(selectedProjectId);
      setApiKeys(api_keys ?? []);
    } catch {
      setApiKeys([]);
    } finally {
      setKeysLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleSave = async (provider: string, key: string) => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await upsertAPIKey(selectedProjectId, provider, key);
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
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      await deleteAPIKey(selectedProjectId, provider);
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
          Configure LiveKit for voice transport and manage provider API keys.
        </p>
      </div>

      <LiveKitSetupSection />

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

      <Suspense>
        <ChangePasswordSection />
      </Suspense>
    </div>
  );
}
