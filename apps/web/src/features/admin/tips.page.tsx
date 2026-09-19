import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";

import { Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AdminShell } from "./ui/admin-page";
import { TipListState, tipButtonClass } from "./ui/tip-list-state";

export function AdminTipsPage() {
  const { apiClient, accessToken } = useSession();
  const { published } = useSearch({ from: "/admin-layout/admin/learning" });
  const query = useQuery({
    queryKey: ["admin", "tips", accessToken],
    queryFn: () => apiClient.getTips(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  useUnauthorizedRedirect(query.error);
  const items = query.data?.items ?? [];

  return (
    <AdminShell backTo={routePaths.admin} backLabel={strings.admin.adminTitle} title={strings.nav.learning}>
      {query.isPending ? <TipListState state="loading" /> : query.isError ? (
        <TipListState state="error" onRetry={() => void query.refetch()} />
      ) : items.length === 0 ? <TipListState state="empty" /> : <>
        <div className="flex items-center justify-between gap-3">
          <Typography variant="h2">{strings.learning.title} · {items.length}</Typography>
          <Button asChild className={`${tipButtonClass} text-[length:var(--button-font-size)]`}><Link to={routePaths.adminTipNew}>{strings.adminTips.add}</Link></Button>
        </div>
        {published ? <Typography className="rounded-lg bg-[var(--success-background)] p-3" role="status" tone="success" variant="p2">{strings.adminTips.saved}</Typography> : null}
        <div className="space-y-3">
          {items.map((tip) => (
            <article className="min-w-0 space-y-2.5 rounded-xl border border-[var(--component-tip-accordion-border)] bg-card p-3.5" key={tip.id}>
              <Typography className="break-words [overflow-wrap:anywhere]" variant="h3">{tip.title}</Typography>
              <Typography className="line-clamp-3 break-words whitespace-pre-wrap [overflow-wrap:anywhere]" tone="muted" variant="p2">{tip.text}</Typography>
              <div className="flex items-center justify-between gap-2">
                <Button asChild className={`${tipButtonClass} text-[length:var(--button-font-size)] px-3.5 text-primary`} variant="outline">
                  <Link aria-label={`${strings.adminTips.edit} ${tip.title}`} params={{ tipId: tip.id }} to={routePaths.adminTipEdit}>{strings.adminTips.edit}</Link>
                </Button>
                {/* Ticket 03 connects these controls before the release flag can be enabled. */}
                <div className="flex gap-2">
                  <Button aria-label={`${strings.adminTips.up} ${tip.title}`} className={`${tipButtonClass} text-[length:var(--button-font-size)] w-11 px-0`} disabled variant="outline">↑</Button>
                  <Button aria-label={`${strings.adminTips.down} ${tip.title}`} className={`${tipButtonClass} text-[length:var(--button-font-size)] w-11 px-0`} disabled variant="outline">↓</Button>
                  <Button className={`${tipButtonClass} text-[length:var(--button-font-size)] px-3.5 text-destructive`} disabled variant="outline">{strings.adminTips.delete}</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </>}
    </AdminShell>
  );
}
