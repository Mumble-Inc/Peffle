"use client";

import { useCallback, useEffect, useState } from "react";
import type { BuyerCapability } from "@/lib/auth/capability";
import { broadcastAuthChanged } from "@/lib/auth/broadcast";

export type AuthSessionState = {
  loading: boolean;
  authenticated: boolean;
  email: string | null;
  emailVerified: boolean;
  capability: BuyerCapability;
  accountId: string | null;
};

const defaultState: AuthSessionState = {
  loading: true,
  authenticated: false,
  email: null,
  emailVerified: false,
  capability: "anonymous",
  accountId: null,
};

export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>(defaultState);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      if (!response.ok) {
        setState({ ...defaultState, loading: false });
        return;
      }
      const payload = (await response.json()) as {
        authenticated?: boolean;
        account?: { id: string; email: string; emailVerified: boolean; capability: BuyerCapability } | null;
        email?: string | null;
        emailVerified?: boolean;
        capability?: BuyerCapability;
      };

      const authenticated = Boolean(payload.authenticated);
      setState({
        loading: false,
        authenticated,
        email: authenticated ? (payload.account?.email ?? null) : null,
        emailVerified: authenticated ? (payload.account?.emailVerified ?? false) : false,
        capability: authenticated ? (payload.account?.capability ?? "buyer") : "anonymous",
        accountId: authenticated ? (payload.account?.id ?? null) : null,
      });
    } catch {
      setState({ ...defaultState, loading: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onAuthChanged() {
      void refresh();
    }
    window.addEventListener("razorflow:auth-changed", onAuthChanged);
    return () => window.removeEventListener("razorflow:auth-changed", onAuthChanged);
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await refresh();
    broadcastAuthChanged();
  }, [refresh]);

  return { ...state, refresh, logout };
}
