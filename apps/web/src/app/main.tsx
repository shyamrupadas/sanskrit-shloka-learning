import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import "@/app/styles.css";

// Recover stale route chunks after deployment, without a reload loop.
// https://vite.dev/guide/build.html#load-error-handling
window.addEventListener("vite:preloadError", (event) => {
  const key = `shlokahub:chunk-reload:${String(event.payload)}`;
  if (!window.sessionStorage.getItem(key)) {
    window.sessionStorage.setItem(key, "1");
    window.location.reload();
  }
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
