import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import {
  SanskritTypography,
  Typography,
} from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";
import { routePaths } from "@/shared/model/routes";
import { Button } from "@/shared/ui/button";

import {
  readLearnShlokaAdviceTipIndex,
  writeLearnShlokaAdviceTipIndex,
} from "./learn-shloka-advice-history";

export function LearnShlokaAdviceDialog({
  disabled = false,
  shlokaCode,
}: {
  disabled?: boolean;
  shlokaCode: string;
}) {
  const tips = strings.learning.tips;
  const [tipIndex, setTipIndex] = useState(() =>
    readLearnShlokaAdviceTipIndex(shlokaCode, tips.length),
  );
  const tip = tips[tipIndex]!;
  const hasAnotherTip = tipIndex < tips.length - 1;

  useEffect(() => {
    writeLearnShlokaAdviceTipIndex(shlokaCode, tipIndex);
  }, [shlokaCode, tipIndex]);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          className="justify-self-end rounded-sm text-sm font-bold text-primary outline-none hover:text-[color:var(--primary-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-[var(--disabled-foreground)]"
          disabled={disabled}
          type="button"
        >
          {strings.learnShloka.advice}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-dvh w-full max-w-[390px] overflow-y-auto rounded-t-[24px] bg-card px-5 pt-3 pb-[calc(28px+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_var(--shadow-high-color)] outline-none">
          <div className="mx-auto h-1 w-[42px] rounded-full bg-border-strong" />
          <div className="mt-[18px] flex h-10 items-center justify-between">
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
          <Dialog.Description asChild>
            <SanskritTypography
              className="mt-[18px] break-words [overflow-wrap:anywhere]"
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
              {tip.text}
            </SanskritTypography>
          </Dialog.Description>
          {hasAnotherTip ? (
            <Typography className="mt-[18px]" tone="muted" variant="p1">
              {strings.learnShloka.advicePosition(
                tipIndex + 1,
                tips.length,
              )}
            </Typography>
          ) : null}
          <div className="mt-[18px] space-y-[9px]">
            <Button
              className="h-[52px] w-full text-[15px] text-primary disabled:bg-[var(--disabled-background)] disabled:text-[var(--disabled-foreground)] disabled:opacity-70"
              disabled={!hasAnotherTip}
              onClick={() => setTipIndex((current) => current + 1)}
              type="button"
              variant="outline"
            >
              {hasAnotherTip
                ? strings.learnShloka.adviceNext
                : strings.learnShloka.adviceExhausted}
            </Button>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
