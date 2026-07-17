import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiClient,
  type ApiTypes,
} from "@sanskrit-shloka-learning/api-contract";

import { SessionContext, type SessionContextValue } from "./session-context";
import {
  clearStoredSession,
  readStoredAccount,
  readStoredToken,
  writeStoredSession,
} from "./storage";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(readStoredToken);
  const [account, setAccount] = useState<ApiTypes.AccountDto | null>(
    readStoredAccount,
  );

  const apiClient = useMemo(
    () =>
      new ApiClient({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
        accessToken: () => accessToken ?? undefined,
        fetch: window.fetch.bind(window),
      }),
    [accessToken],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setAccount(null);
    clearStoredSession();
  }, []);

  const setSession = useCallback((session: ApiTypes.AuthSessionDto) => {
    setAccessToken(session.accessToken);
    setAccount(session.account);
    writeStoredSession(session);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await apiClient.logout();
      }
    } finally {
      clearSession();
    }
  }, [accessToken, apiClient, clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      account,
      accessToken,
      apiClient,
      clearSession,
      hasSession: Boolean(accessToken),
      logout,
      setSession,
    }),
    [account, accessToken, apiClient, clearSession, logout, setSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
