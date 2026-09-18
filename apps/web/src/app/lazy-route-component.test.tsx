import { act, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { mockApi, storeTestSession, successfulAuthApi } from "@/shared/test/harness";

const pageImport = vi.hoisted(() => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { started: vi.fn(), ready: { promise, resolve } };
});

vi.mock("@/features/learn-shloka/learn-shloka.page", async () => {
  pageImport.started();
  await pageImport.ready.promise;
  return {
    LearnShlokaPage: ({ shlokaCode, returnTo }: { shlokaCode: string; returnTo: string }) => (
      <h1>{shlokaCode}: {returnTo}</h1>
    ),
  };
});

it("opens a cold route without React use diagnostics and passes its params and search", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  mockApi(successfulAuthApi);
  storeTestSession();
  window.history.replaceState(
    {},
    "",
    "/library/shlokas/gita-1-1/learn?returnTo=%2Flibrary%3Ftab%3Dlearning",
  );

  await act(async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
  await waitFor(() => expect(pageImport.started).toHaveBeenCalled());
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();

  await act(async () => {
    pageImport.ready.resolve();
  });

  expect(await screen.findByRole("heading", {
    name: "gita-1-1: /library?tab=learning",
  })).toBeInTheDocument();
  expect(consoleError).not.toHaveBeenCalled();
});
