import { useEffect, useState } from "react";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import {
  EmptyState,
  TipAccordionItem,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { useSession } from "@/shared/session";

export function LearningPage() {
  const { apiClient } = useSession();
  const [items, setItems] = useState<ApiTypes.LearningTipDto[]>();
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    void apiClient.getTips().then(
      (result) => {
        if (active) setItems(result.items);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => { active = false; };
  }, [apiClient, request]);

  return (
    <section className="mx-auto w-full min-w-0 max-w-[688px] space-y-4">
      <Typography variant="h1">{strings.learning.title}</Typography>
      {failed ? (
        <EmptyState
          action={
            <button
              onClick={() => {
                setFailed(false);
                setRequest((value) => value + 1);
              }}
              type="button"
            >
              {strings.learning.retry}
            </button>
          }
          actionFullWidth
          description={strings.learning.errorDescription}
          showIcon={false}
          title={strings.learning.errorTitle}
        />
      ) : items === undefined ? (
        <Typography role="status" tone="muted" variant="p2">
          {strings.learning.loading}
        </Typography>
      ) : items.length === 0 ? (
        <EmptyState
          description={strings.learning.emptyDescription}
          showIcon={false}
          title={strings.learning.empty}
        />
      ) : (
        <div className="space-y-4">
          {items.map((tip, index) => (
            <TipAccordionItem
              defaultExpanded={index === items.length - 1}
              key={tip.id}
              text={tip.text}
              title={tip.title}
            />
          ))}
        </div>
      )}
    </section>
  );
}
