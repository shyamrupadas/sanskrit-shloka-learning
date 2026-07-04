import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { expect, vi } from "vitest";

import { SessionProvider } from "@/shared/session";
import {
  readStoredAccount,
  readStoredToken,
  writeStoredSession,
} from "@/shared/session/storage";

export const session = {
  account: {
    id: "account-1",
    email: "learner@example.com",
    roles: [],
  },
  accessToken: "access-token-1",
} satisfies ApiTypes.AuthSessionDto;

export const adminSession = {
  account: {
    id: "account-2",
    email: "admin@example.com",
    roles: ["admin"],
  },
  accessToken: "access-token-2",
} satisfies ApiTypes.AuthSessionDto;

export function renderWithTestProviders(ui: ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <SessionProvider>{ui}</SessionProvider>
    </QueryClientProvider>,
  );
}

export async function expectPath(path: string): Promise<void> {
  await waitFor(() => {
    expect(window.location.pathname).toBe(path);
  });
}

export function storeTestSession(
  nextSession: ApiTypes.AuthSessionDto = session,
): void {
  writeStoredSession(nextSession);
}

export function expectStoredSessionCleared(): void {
  expect(readStoredToken()).toBeNull();
  expect(readStoredAccount()).toBeNull();
}

export interface MockApiRequest {
  body?: unknown;
  method: string;
  path: string;
}

export interface MockApiResponse {
  body?: unknown;
  status: number;
}

export type MockApiHandler = (
  request: MockApiRequest,
) => MockApiResponse | Promise<MockApiResponse>;

export function mockApi(handler: MockApiHandler) {
  const fetchMock = vi.fn(
    async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const requestBody =
        typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      const response = await handler({
        body: requestBody,
        method: init?.method ?? "GET",
        path: url.pathname,
      });
      const headers = new Headers();
      let body: BodyInit | null = null;

      if (response.body !== undefined) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(response.body);
      }

      return new Response(body, {
        headers,
        status: response.status,
      });
    },
  );
  const typedFetch = fetchMock as unknown as typeof fetch;

  vi.stubGlobal("fetch", typedFetch);
  Object.defineProperty(window, "fetch", {
    configurable: true,
    value: typedFetch,
    writable: true,
  });

  return fetchMock;
}

export function successfulAuthApi({
  method,
  path,
}: MockApiRequest): MockApiResponse {
  if (method === "POST" && path === "/api/auth/register") {
    return { status: 201, body: session };
  }

  if (method === "POST" && path === "/api/auth/login") {
    return { status: 200, body: session };
  }

  if (method === "GET" && path === "/api/auth/session") {
    return { status: 200, body: session };
  }

  if (method === "POST" && path === "/api/auth/logout") {
    return { status: 204 };
  }

  throw new Error(`Unhandled test API request: ${method} ${path}`);
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
    },
  });
}
