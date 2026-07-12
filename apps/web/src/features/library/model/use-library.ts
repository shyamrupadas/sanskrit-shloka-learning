import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { useSession, useUnauthorizedRedirect } from "@/shared/session";

export interface LibraryModel {
  activeTab: ApiTypes.LibraryTab;
  data: ApiTypes.LibraryResponseDto | undefined;
  isLoading: boolean;
  loadError: Error | null;
  searchQuery: string;
  setActiveTab: (tab: ApiTypes.LibraryTab) => void;
  setSearchQuery: (query: string) => void;
  updateError: Error | null;
  updateStatus: (
    shlokaCode: string,
    personalStatus: ApiTypes.UpdateLibraryShlokaStatus,
  ) => void;
  updatingShlokaCode: string | undefined;
}

export function useLibrary(initialTab?: ApiTypes.LibraryTab): LibraryModel {
  const auth = useSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApiTypes.LibraryTab>(
    initialTab ?? "reviewing",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const didApplyDefaultTab = useRef(initialTab !== undefined);
  const libraryQuery = useQuery({
    queryFn: () => auth.apiClient.getLibrary(),
    queryKey: ["library"],
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({
      personalStatus,
      shlokaCode,
    }: {
      personalStatus: ApiTypes.UpdateLibraryShlokaStatus;
      shlokaCode: string;
    }) => auth.apiClient.updateItem(shlokaCode, { personalStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });

  useUnauthorizedRedirect(libraryQuery.error);

  useEffect(() => {
    if (libraryQuery.data && !didApplyDefaultTab.current) {
      didApplyDefaultTab.current = true;
      setActiveTab(libraryQuery.data.defaultTab);
    }
  }, [libraryQuery.data]);

  return {
    activeTab,
    data: libraryQuery.data,
    isLoading: libraryQuery.isPending,
    loadError: libraryQuery.error,
    searchQuery,
    setActiveTab,
    setSearchQuery,
    updateError: updateStatusMutation.error,
    updateStatus: (shlokaCode, personalStatus) => {
      updateStatusMutation.mutate({ personalStatus, shlokaCode });
    },
    updatingShlokaCode: updateStatusMutation.isPending
      ? updateStatusMutation.variables.shlokaCode
      : undefined,
  };
}
