import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { useLibrary } from "./model/use-library";
import { LibraryView } from "./ui/library-view";

export function LibraryPage({
  initialTab,
}: {
  initialTab?: ApiTypes.LibraryTab;
}) {
  const model = useLibrary(initialTab);

  return <LibraryView model={model} />;
}
