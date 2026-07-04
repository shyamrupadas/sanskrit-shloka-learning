import { useLibrary } from "./model/use-library";
import { LibraryView } from "./ui/library-view";

export function LibraryPage() {
  const model = useLibrary();

  return <LibraryView model={model} />;
}
