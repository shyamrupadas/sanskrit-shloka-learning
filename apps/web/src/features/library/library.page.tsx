import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  BottomNavigation,
  ScreenLayout,
} from "@/shared/design-system/components";

import { useLibrary } from "./model/use-library";
import { LibraryView } from "./ui/library-view";

export function LibraryPage({
  initialTab,
}: {
  initialTab?: ApiTypes.LibraryTab;
}) {
  const model = useLibrary(initialTab);

  return (
    <ScreenLayout
      contentClassName="px-4 pt-5 pb-8 sm:px-6"
      footer={<BottomNavigation activeSection="library" fixed={false} />}
    >
      <LibraryView model={model} />
    </ScreenLayout>
  );
}
