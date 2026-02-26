"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";
import { syncUser, type User } from "@/lib/api";

interface UserSyncCtx {
  backendUser: User | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const Ctx = createContext<UserSyncCtx>({
  backendUser: null,
  loading: true,
  error: null,
  retry: () => {},
});

export function useBackendUser() {
  return useContext(Ctx);
}

export function UserSyncProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doSync = useCallback(() => {
    if (!isLoaded || !user) return;

    setLoading(true);
    setError(null);

    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || email;
    const avatar = user.imageUrl || undefined;

    syncUser({
      email,
      name,
      auth_provider: "clerk",
      auth_provider_id: user.id,
      avatar_url: avatar,
    })
      .then(setBackendUser)
      .catch(() =>
        setError("Could not connect to the backend. Is the API server running?")
      )
      .finally(() => setLoading(false));
  }, [isLoaded, user]);

  useEffect(() => {
    doSync();
  }, [doSync]);

  return (
    <Ctx.Provider value={{ backendUser, loading, error, retry: doSync }}>
      {children}
    </Ctx.Provider>
  );
}
