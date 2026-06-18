import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiClient,
  type ApiTypes,
} from "@sanskrit-shloka-learning/api-contract";

const ACCESS_TOKEN_STORAGE_KEY = "sanskrit-shloka-learning.access-token";
const ACCOUNT_STORAGE_KEY = "sanskrit-shloka-learning.account";

export interface AuthContextValue {
  account: ApiTypes.AccountDto | null;
  accessToken: string | null;
  apiClient: ApiClient;
  clearSession: () => void;
  hasSession: boolean;
  logout: () => Promise<void>;
  setSession: (session: ApiTypes.AuthSessionDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  }, []);

  const setSession = useCallback((session: ApiTypes.AuthSessionDto) => {
    setAccessToken(session.accessToken);
    setAccount(session.account);
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
    window.localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify(session.account),
    );
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

  const value = useMemo<AuthContextValue>(
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return auth;
}

function readStoredToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function readStoredAccount(): ApiTypes.AccountDto | null {
  const rawAccount = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);

  if (!rawAccount) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawAccount) as Partial<ApiTypes.AccountDto>;

    if (typeof parsed.id === "string" && typeof parsed.email === "string") {
      return {
        id: parsed.id,
        email: parsed.email,
        roles: Array.isArray(parsed.roles)
          ? parsed.roles.filter((role): role is ApiTypes.AccountRole => role === "admin")
          : [],
      };
    }
  } catch {
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  }

  return null;
}
