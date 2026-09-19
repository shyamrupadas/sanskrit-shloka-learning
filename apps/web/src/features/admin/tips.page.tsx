import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { Dialog } from "radix-ui";

import { ModalContent, Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import { AdminShell } from "./ui/admin-page";
import { TipListState, tipButtonClass } from "./ui/tip-list-state";

type TipCommand = { tipId: string } & ({ action: "move"; direction: "up" | "down" } | { action: "delete" });
const directionButtonClass = `${tipButtonClass} w-11 bg-card px-0 text-primary disabled:bg-[var(--disabled-background)] disabled:text-[color:var(--disabled-foreground)] disabled:opacity-100`;

export function AdminTipsPage() {
  const { apiClient, accessToken } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "tips", accessToken];
  const [deleting, setDeleting] = useState<ApiTypes.LearningTipDto>();
  const { published } = useSearch({ from: "/admin-layout/admin/learning" });
  const query = useQuery({
    queryKey,
    queryFn: () => apiClient.getTips(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const mutation = useMutation({
    mutationFn: (command: TipCommand) => command.action === "move"
      ? apiClient.move(command.tipId, { direction: command.direction })
      : apiClient.deleteTip(command.tipId),
    onMutate: () => queryClient.cancelQueries({ queryKey }),
    onSuccess: (list) => queryClient.setQueryData(queryKey, list),
  });
  useUnauthorizedRedirect(query.error);
  useUnauthorizedRedirect(mutation.error);
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
        {mutation.isError ? <Typography className="rounded-lg bg-[var(--danger-background)] p-3.5" role="alert" tone="danger" variant="p2">{mutation.variables?.action === "delete" ? strings.adminTips.deleteError : strings.adminTips.moveError}</Typography> : published ? <Typography className="rounded-lg bg-[var(--success-background)] p-3" role="status" tone="success" variant="p2">{strings.adminTips.saved}</Typography> : null}
        <div className="space-y-3">
          {items.map((tip, index) => (
            <article className="min-w-0 space-y-2.5 rounded-xl border border-[var(--component-tip-accordion-border)] bg-card p-3.5" key={tip.id}>
              <Typography className="break-words [overflow-wrap:anywhere]" variant="h3">{tip.title}</Typography>
              <Typography className="line-clamp-3 break-words whitespace-pre-wrap [overflow-wrap:anywhere]" tone="muted" variant="p2">{tip.text}</Typography>
              <div className="flex items-center justify-between gap-2">
                <Button asChild className={`${tipButtonClass} text-[length:var(--button-font-size)] bg-card px-3.5 text-primary`} variant="outline">
                  <Link aria-label={`${strings.adminTips.edit} ${tip.title}`} params={{ tipId: tip.id }} to={routePaths.adminTipEdit}>{strings.adminTips.edit}</Link>
                </Button>
                <div className="flex gap-2">
                  <Button aria-label={`${strings.adminTips.up} ${tip.title}`} className={`${directionButtonClass} text-[length:var(--button-font-size)]`} disabled={mutation.isPending || index === 0} onClick={() => mutation.mutate({ action: "move", tipId: tip.id, direction: "up" })} variant="outline">↑</Button>
                  <Button aria-label={`${strings.adminTips.down} ${tip.title}`} className={`${directionButtonClass} text-[length:var(--button-font-size)]`} disabled={mutation.isPending || index === items.length - 1} onClick={() => mutation.mutate({ action: "move", tipId: tip.id, direction: "down" })} variant="outline">↓</Button>
                  <Button aria-label={`${strings.adminTips.delete} ${tip.title}`} className={`${tipButtonClass} text-[length:var(--button-font-size)] bg-card px-3.5 text-destructive`} disabled={mutation.isPending} onClick={() => setDeleting(tip)} variant="outline">{strings.adminTips.delete}</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </>}
      <Dialog.Root open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(undefined); }}>
        <ModalContent>
          <div className="space-y-4">
            <Dialog.Title asChild><Typography as="h1" variant="p4" weight="bold">{strings.adminTips.deleteTitle}</Typography></Dialog.Title>
            <Dialog.Description asChild><Typography className="break-words [overflow-wrap:anywhere]" tone="muted" variant="p2">{strings.adminTips.deleteDescription(deleting?.title ?? "")}</Typography></Dialog.Description>
            <div className="flex flex-col gap-2">
              <Button className={`${tipButtonClass} text-[length:var(--button-font-size)] w-full bg-destructive text-primary-foreground hover:bg-destructive/90`} onClick={() => {
                if (!deleting || mutation.isPending) return;
                mutation.mutate({ action: "delete", tipId: deleting.id });
                setDeleting(undefined);
              }}>{strings.adminTips.deleteForever}</Button>
              <Button className={`${tipButtonClass} text-[length:var(--button-font-size)] w-full bg-card text-primary`} onClick={() => setDeleting(undefined)} variant="outline">{strings.adminTips.cancel}</Button>
            </div>
          </div>
        </ModalContent>
      </Dialog.Root>
    </AdminShell>
  );
}
