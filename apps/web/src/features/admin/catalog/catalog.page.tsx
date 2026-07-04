import { useQuery } from "@tanstack/react-query";

import { useSession, useUnauthorizedRedirect } from "@/shared/session";

import { CatalogView } from "./ui/catalog-view";

export function AdminCatalogPage() {
  const session = useSession();
  const catalogQuery = useQuery({
    queryFn: () => session.apiClient.getCatalog(),
    queryKey: ["admin", "catalog"],
  });

  useUnauthorizedRedirect(catalogQuery.error);

  return (
    <CatalogView
      catalog={catalogQuery.data}
      error={catalogQuery.error}
      isPending={catalogQuery.isPending}
    />
  );
}
