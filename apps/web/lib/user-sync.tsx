"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface UserSyncCtx {
  backendUser: User | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<UserSyncCtx>({
  backendUser: null,
  loading: true,
  error: null,
  retry: () => {},
  logout: async () => {},
});

export function useBackendUser() {
  return useContext(Ctx);
}

export function UserSyncProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      setBackendUser(data.user);
    } catch {
      setError("Could not connect to the backend. Is the API server running?");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setBackendUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <Ctx.Provider value={{ backendUser, loading, error, retry: fetchMe, logout }}>
      {children}
    </Ctx.Provider>
  );
}
