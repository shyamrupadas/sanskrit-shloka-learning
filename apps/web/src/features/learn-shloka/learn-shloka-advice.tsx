import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { ModalContent, Typography } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { useSession } from "@/shared/session";
import { Button } from "@/shared/ui/button";

import {
  attachLearnShlokaAdviceAttempt,
  loadLearnShlokaAdvice,
  readLearnShlokaAdviceAttempt,
  writeLearnShlokaAdviceAttempt,
} from "./learn-shloka-advice-history";

export function LearnShlokaAdviceDialog({
  disabled = false,
  shlokaCode,
}: {
  disabled?: boolean;
  shlokaCode: string;
}) {
  const { apiClient } = useSession();
  const [attempt, setAttempt] = useState(() =>
    readLearnShlokaAdviceAttempt(shlokaCode),
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef(false);
  const pending = useRef(false);
  const tips = attempt.tips;
  const tipIndex = attempt.tipIndex;
  const tip = tips?.[tipIndex];
  const hasAnotherTip = tips !== null && tipIndex < tips.length - 1;
  const description = tip?.text ?? (
    loading || (!failed && tips === null)
      ? strings.learning.loading
      : failed ? strings.learning.error : strings.learning.empty
  );

  useEffect(() => {
    active.current = true;
    attachLearnShlokaAdviceAttempt(attempt);
    return () => { active.current = false; };
  }, [attempt]);

  async function loadTips(): Promise<void> {
    if (tips !== null || pending.current) return;
    pending.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const captured = await loadLearnShlokaAdvice(
        attempt.id,
        () => apiClient.getTips(),
      );
      if (active.current && captured) setAttempt(captured);
    } catch {
      if (active.current) setFailed(true);
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  }

  return (
    <Dialog.Root onOpenChange={(open) => { if (open) void loadTips(); }}>
      <Dialog.Trigger asChild>
        <button
          className="justify-self-end rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-[var(--disabled-foreground)]"
          disabled={disabled}
          type="button"
        >
          {strings.learnShloka.advice}
        </button>
      </Dialog.Trigger>
      <ModalContent>
        <div className="flex h-10 items-center justify-between">
          <Dialog.Title asChild>
            <Typography
              as="h2"
              style={
                {
                  "--typography-h1-size":
                    "var(--component-learning-advice-title-size)",
                } as CSSProperties
              }
              variant="h1"
            >
              {strings.learnShloka.advice}
            </Typography>
          </Dialog.Title>
          <Dialog.Close asChild>
            <Button
              aria-label={strings.learnShloka.adviceClose}
              className="size-10 rounded-full text-foreground"
              size="icon"
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </Dialog.Close>
        </div>
        {tip ? (
          <Typography
            className="mt-4 break-words [overflow-wrap:anywhere]"
            variant="h2"
          >
            {tip.title}
          </Typography>
        ) : null}
        <Dialog.Description asChild>
          <Typography
            className="mt-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
            style={
              {
                "--typography-body-line-height":
                  "var(--component-learning-advice-text-line-height)",
                "--typography-p3-size":
                  "var(--component-learning-advice-text-size)",
              } as CSSProperties
            }
            variant="p3"
          >
            {description}
          </Typography>
        </Dialog.Description>
        {hasAnotherTip ? (
          <Typography className="mt-4" tone="muted" variant="p1">
            {strings.learnShloka.advicePosition(
              tipIndex + 1,
              tips!.length,
            )}
          </Typography>
        ) : null}
        <div className="mt-4 space-y-[9px]">
          {tip || failed ? (
            <Button
            className={`h-[52px] w-full text-[15px] ${failed ? "" : "text-primary"} disabled:bg-[var(--disabled-background)] disabled:text-[var(--disabled-foreground)] disabled:opacity-70`}
            disabled={!failed && !hasAnotherTip}
            onClick={() => {
              if (failed) { void loadTips(); return; }
              if (hasAnotherTip) {
                const next = { ...attempt, tipIndex: tipIndex + 1 };
                writeLearnShlokaAdviceAttempt(next);
                setAttempt(next);
              }
            }}
            type="button"
            variant={failed ? "default" : "outline"}
          >
            {failed ? strings.learning.retry : hasAnotherTip
              ? strings.learnShloka.adviceNext
              : strings.learnShloka.adviceExhausted}
            </Button>
          ) : null}
          <Button
            asChild
            className="h-10 w-full text-sm font-bold"
            variant="link"
          >
            <Link to={routePaths.learning}>
              {strings.learnShloka.allAdvice}
            </Link>
          </Button>
        </div>
      </ModalContent>
    </Dialog.Root>
  );
}
