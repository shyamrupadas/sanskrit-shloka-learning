import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { AuthProvider, useAuth } from "@/auth/auth-context";
import { createAppRouter } from "@/router";

type AppRouterInstance = ReturnType<typeof createAppRouter>;

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppRouter({ router }: { router: AppRouterInstance }) {
  const auth = useAuth();

  return <RouterProvider router={router} context={{ auth }} />;
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
