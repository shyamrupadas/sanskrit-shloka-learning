import {
  useCallback,
  useMemo,
  useRef,
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

const sessionVerificationMaxAge = 30_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(readStoredToken);
  const [account, setAccount] = useState<ApiTypes.AccountDto | null>(
    readStoredAccount,
  );
  const verifiedSession = useRef<ApiTypes.AuthSessionDto | null>(null);
  const verifiedAt = useRef(0);
  const pendingVerification = useRef<{
    token: string;
    promise: Promise<ApiTypes.AccountDto | null>;
  } | null>(null);

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
    verifiedSession.current = null;
    verifiedAt.current = 0;
    pendingVerification.current = null;
    setAccessToken(null);
    setAccount(null);
    clearStoredSession();
  }, []);

  const setSession = useCallback((session: ApiTypes.AuthSessionDto) => {
    verifiedSession.current = session;
    verifiedAt.current = Date.now();
    pendingVerification.current = null;
    setAccessToken(session.accessToken);
    setAccount(session.account);
    writeStoredSession(session);
  }, []);

  const verifySession = useCallback((force = false): Promise<ApiTypes.AccountDto | null> => {
    if (!accessToken) return Promise.resolve(null);
    if (
      !force &&
      verifiedSession.current?.accessToken === accessToken &&
      Date.now() - verifiedAt.current < sessionVerificationMaxAge
    ) {
      return Promise.resolve(verifiedSession.current.account);
    }
    if (pendingVerification.current?.token === accessToken) {
      return pendingVerification.current.promise;
    }

    const promise = apiClient.getSession().then(
      (nextSession) => {
        if (readStoredToken() !== accessToken) return null;
        setSession(nextSession);
        return nextSession.account;
      },
      (error: unknown) => {
        pendingVerification.current = null;
        throw error;
      },
    );
    pendingVerification.current = { token: accessToken, promise };
    return promise;
  }, [accessToken, apiClient, setSession]);

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
      verifySession,
    }),
    [account, accessToken, apiClient, clearSession, logout, setSession, verifySession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
