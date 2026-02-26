"use client";

import { useBackendUser } from "@/lib/user-sync";
import { RefreshCw } from "lucide-react";

export function Spinner() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}

export function SyncError() {
  const { error, retry } = useBackendUser();
  if (!error) return null;
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-sm text-[#a1a1aa]">{error}</p>
      <button
        onClick={retry}
        className="mt-4 flex items-center gap-2 rounded-md bg-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.12]"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}

export function usePageReady() {
  const { backendUser, loading, error } = useBackendUser();
  return {
    backendUser,
    userLoading: loading,
    syncError: error,
    ready: !loading && !error && !!backendUser,
  };
}
