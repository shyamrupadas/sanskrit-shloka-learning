import type { ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/tabs";

export type LibraryTabItem<TValue extends string = string> = {
  id: TValue;
  label: string;
};

export type LibraryTabsProps<TValue extends string = string> = {
  activeTab: TValue;
  onTabChange: (value: TValue) => void;
  renderPanel: (value: TValue) => ReactNode;
  tabs: readonly LibraryTabItem<TValue>[];
};

export function LibraryTabs<TValue extends string>({
  activeTab,
  onTabChange,
  renderPanel,
  tabs,
}: LibraryTabsProps<TValue>) {
  return (
    <Tabs
      className="gap-3.5"
      onValueChange={(value) => onTabChange(value as TValue)}
      value={activeTab}
    >
      <TabsList className="h-[var(--component-tab-height)] w-full rounded-full bg-muted p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            className="rounded-full px-1 text-[length:var(--font-size-caption)] font-semibold text-muted-foreground data-active:bg-card data-active:font-bold data-active:text-foreground data-active:shadow-[var(--shadow-low)]"
            key={tab.id}
            value={tab.id}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent className="mt-0" key={tab.id} value={tab.id}>
          {renderPanel(tab.id)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
