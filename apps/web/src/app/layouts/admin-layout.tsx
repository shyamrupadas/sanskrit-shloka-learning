import { Outlet } from "@tanstack/react-router";

export function AdminLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
