import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useBlocker, useParams, useRouter } from "@tanstack/react-router";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";
import { Dialog } from "radix-ui";

import { ModalContent, Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession, useUnauthorizedRedirect } from "@/shared/session";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

import { AdminShell } from "./ui/admin-page";
import { TipListState, tipButtonClass } from "./ui/tip-list-state";

export function AdminTipEditorPage() {
  const { tipId } = useParams({ strict: false });
  const { apiClient, accessToken } = useSession();
  const query = useQuery({
    queryKey: ["admin", "tip", accessToken, tipId],
    queryFn: () => apiClient.getTips(),
    enabled: !!tipId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useUnauthorizedRedirect(query.error);
  const tip = query.data?.items.find((item) => item.id === tipId);

  return (
    <AdminShell backTo={routePaths.adminLearning} backLabel={strings.learning.title} title={tipId ? strings.adminTips.editTitle : strings.adminTips.newTitle} subtitle={strings.adminTips.publishDescription}>
      {!tipId ? <TipForm /> : query.isPending ? <TipListState state="loading" /> : query.isError ? (
        <TipListState state="error" onRetry={() => void query.refetch()} />
      ) : tip ? <TipForm key={tip.id} tip={tip} /> : <Typography role="alert">{strings.adminTips.missing}</Typography>}
    </AdminShell>
  );
}

function TipForm({ tip }: { tip?: ApiTypes.LearningTipDto }) {
  const { apiClient } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState(tip?.title ?? "");
  const [text, setText] = useState(tip?.text ?? "");
  const [submitted, setSubmitted] = useState(false);
  const saved = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const dirty = title !== (tip?.title ?? "") || text !== (tip?.text ?? "");
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });
  const mutation = useMutation({ mutationFn: (body: ApiTypes.SaveLearningTipRequest) => tip ? apiClient.updateTip(tip.id, body) : apiClient.tips(body) });
  useUnauthorizedRedirect(mutation.error);
  const titleError = !title.trim() ? strings.adminTips.titleRequired : [...title.trim()].length > 120 ? strings.adminTips.titleLimit : undefined;
  const textError = !text.trim() ? strings.adminTips.textRequired : [...text.trim()].length > 2000 ? strings.adminTips.textLimit : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    setSubmitted(true);
    if (titleError || textError) return;
    try {
      await mutation.mutateAsync({ title: title.trim(), text: text.trim() });
      if (!mounted.current) return;
      saved.current = true;
      await router.navigate({ to: routePaths.adminLearning, search: { published: true }, ignoreBlocker: true });
    } catch {
      // The mutation error is shown with the unchanged form values.
    }
  }

  return <>
    <form className="space-y-5" noValidate onSubmit={submit}>
      <div className="space-y-2">
        <Label className="leading-[1.25]" htmlFor="tip-title">{strings.adminTips.title}</Label>
        <Input aria-describedby="tip-title-count tip-title-error" aria-invalid={submitted && !!titleError} className="h-11 rounded-lg bg-card px-3 text-[length:var(--input-text-size)] placeholder:text-[var(--placeholder)]" disabled={mutation.isPending} id="tip-title" onChange={(event) => setTitle(event.target.value)} placeholder={strings.adminTips.titlePlaceholder} required value={title} />
        <Typography id="tip-title-count" tone="muted" variant="p1">{[...title].length} / 120</Typography>
        {submitted && titleError ? <Typography id="tip-title-error" tone="danger" variant="p1">{titleError}</Typography> : null}
        <Label className="leading-[1.25]" htmlFor="tip-text">{strings.adminTips.text}</Label>
        <Textarea aria-describedby="tip-text-count tip-text-error" aria-invalid={submitted && !!textError} className="min-h-60 resize-none rounded-lg bg-card p-3 text-[length:var(--input-text-size)] placeholder:text-[var(--placeholder)] [overflow-wrap:anywhere]" disabled={mutation.isPending} id="tip-text" onChange={(event) => setText(event.target.value)} placeholder={strings.adminTips.textPlaceholder} required value={text} />
        <Typography id="tip-text-count" tone="muted" variant="p1">{[...text].length} / 2000</Typography>
        {submitted && textError ? <Typography id="tip-text-error" tone="danger" variant="p1">{textError}</Typography> : null}
      </div>
      {mutation.isError ? <Typography className="rounded-lg border border-destructive/30 bg-destructive/10 p-3" role="alert" tone="danger" variant="p2">{strings.adminTips.saveError}</Typography> : null}
      <div className="flex gap-3">
        <Button className={`${tipButtonClass} text-[length:var(--button-font-size)]`} disabled={mutation.isPending} type="submit">{mutation.isPending ? strings.adminTips.saving : strings.adminTips.save}</Button>
        <Button asChild className={`${tipButtonClass} text-[length:var(--button-font-size)] bg-card text-primary`} variant="outline"><Link to={routePaths.adminLearning}>{strings.adminTips.cancel}</Link></Button>
      </div>
    </form>
    <Dialog.Root open={blocker.status === "blocked"} onOpenChange={(open) => { if (!open) blocker.reset?.(); }}>
      <ModalContent>
        <div className="space-y-4">
          <Dialog.Title asChild><Typography as="h1" variant="p4" weight="bold">{strings.adminTips.leaveTitle}</Typography></Dialog.Title>
          <Dialog.Description asChild><Typography tone="muted" variant="p2">{strings.adminTips.leaveDescription}</Typography></Dialog.Description>
          <div className="flex flex-col gap-2">
            <Button className={`${tipButtonClass} text-[length:var(--button-font-size)] w-full`} onClick={() => blocker.reset?.()}>{strings.adminTips.stay}</Button>
            <Button className={`${tipButtonClass} text-[length:var(--button-font-size)] w-full bg-card text-primary`} onClick={() => blocker.proceed?.()} variant="outline">{strings.adminTips.leave}</Button>
          </div>
        </div>
      </ModalContent>
    </Dialog.Root>
  </>;
}
