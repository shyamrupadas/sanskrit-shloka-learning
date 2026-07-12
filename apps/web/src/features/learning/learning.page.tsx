import { TipAccordionItem } from "@/shared/design-system/components";
import { strings } from "@/shared/i18n";

export function LearningPage() {
  return (
    <section className="min-w-0 space-y-4">
      <h1 className="font-heading text-[length:var(--font-size-screen-title)] leading-[var(--line-height-title)] font-extrabold">
        {strings.learning.title}
      </h1>
      <div className="space-y-4">
        {strings.learning.tips.map((tip, index) => (
          <TipAccordionItem
            defaultExpanded={index === strings.learning.tips.length - 1}
            key={tip.id}
            text={tip.text}
            title={tip.title}
          />
        ))}
      </div>
    </section>
  );
}
