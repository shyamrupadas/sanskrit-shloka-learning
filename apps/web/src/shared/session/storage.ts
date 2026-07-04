import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

const ACCESS_TOKEN_STORAGE_KEY = "sanskrit-shloka-learning.access-token";
const ACCOUNT_STORAGE_KEY = "sanskrit-shloka-learning.account";

export function readStoredToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function readStoredAccount(): ApiTypes.AccountDto | null {
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
          ? parsed.roles.filter(
              (role): role is ApiTypes.AccountRole => role === "admin",
            )
          : [],
      };
    }
  } catch {
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  }

  return null;
}

export function writeStoredSession(session: ApiTypes.AuthSessionDto): void {
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
  window.localStorage.setItem(
    ACCOUNT_STORAGE_KEY,
    JSON.stringify(session.account),
  );
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}
