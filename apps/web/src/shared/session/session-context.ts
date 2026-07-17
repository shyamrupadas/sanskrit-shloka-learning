import { createContext, useContext } from "react";
import type {
  ApiClient,
  ApiTypes,
} from "@sanskrit-shloka-learning/api-contract";

export interface SessionContextValue {
  account: ApiTypes.AccountDto | null;
  accessToken: string | null;
  apiClient: ApiClient;
  clearSession: () => void;
  hasSession: boolean;
  logout: () => Promise<void>;
  setSession: (session: ApiTypes.AuthSessionDto) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return session;
}
