import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { createAppRouter } from "@/app/router";
import { SessionProvider, useSession } from "@/shared/session";

type AppRouterInstance = ReturnType<typeof createAppRouter>;

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppRouter router={router} />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function AppRouter({ router }: { router: AppRouterInstance }) {
  const session = useSession();

  return <RouterProvider router={router} context={{ session }} />;
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
    },
  });
}
