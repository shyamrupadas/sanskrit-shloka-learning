import { useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { Typography } from "@/shared/design-system/components";
import { designTokens } from "@/shared/design-system/tokens";

export interface TooltipProps {
  content: string;
  label: string;
}

export function Tooltip({ content, label }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root open={open}>
        <TooltipPrimitive.Trigger
          data-slot="tooltip-trigger"
          ref={triggerRef}
          aria-label={label}
          className="relative shrink-0 rounded-sm text-primary outline-none after:absolute after:-inset-2 focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={() => setOpen(false)}
          onClick={() => setOpen((previous) => !previous)}
          type="button"
        >
          <CircleHelp
            aria-hidden="true"
            className="size-[var(--component-help-tooltip-icon-size)]"
          />
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            data-slot="tooltip-content"
            className="z-50 inline-flex origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-[var(--component-help-tooltip-width)] max-w-[calc(100vw-var(--screen-gutter)*2)] border border-border bg-card p-3 text-foreground shadow-[var(--component-help-tooltip-shadow)]"
            collisionPadding={designTokens.spacing.screenGutter.value}
            onEscapeKeyDown={() => setOpen(false)}
            onPointerDownOutside={(event) => {
              if (
                event.target instanceof Node &&
                triggerRef.current?.contains(event.target)
              ) {
                return;
              }
              setOpen(false);
            }}
            side="bottom"
            sideOffset={designTokens.components.helpTooltip.sideOffset.value}
          >
            <Typography variant="p2">{content}</Typography>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
