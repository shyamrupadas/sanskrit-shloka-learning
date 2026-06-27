import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { getApiErrorMessage } from "@/api/errors";
import { useAuth } from "@/auth/auth-context";
import { useUnauthorizedRedirect } from "@/auth/use-unauthorized-redirect";
import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { strings } from "@/shared/i18n";

export function LibraryPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<ApiTypes.LibraryTab>("reviewing");
  const libraryQuery = useQuery({
    queryFn: () => auth.apiClient.getLibrary(),
    queryKey: ["library"],
  });

  useUnauthorizedRedirect(libraryQuery.error);

  useEffect(() => {
    if (libraryQuery.data) {
      setActiveTab(libraryQuery.data.defaultTab);
    }
  }, [libraryQuery.data]);

  return (
    <AppShell>
      <section className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">
            {strings.library.title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {strings.library.subtitle}
          </p>
        </div>

        {libraryQuery.isPending ? (
          <StatusCard title={strings.common.loading} />
        ) : libraryQuery.error ? (
          <StatusCard
            description={getApiErrorMessage(
              libraryQuery.error,
              strings.library.loadError,
            )}
            title={strings.common.error}
          />
        ) : (
          <Tabs onValueChange={(value) => setActiveTab(value as ApiTypes.LibraryTab)} value={activeTab}>
            <TabsList className="grid w-full grid-cols-3">
              {libraryQuery.data.tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {libraryQuery.data.tabs.map((tab) => (
              <TabsContent className="pt-3" key={tab.id} value={tab.id}>
                {tab.id === "all" && libraryQuery.data.allShlokas.length > 0 ? (
                  <div className="space-y-3">
                    {libraryQuery.data.allShlokas.map((shloka) => (
                      <ShlokaCard key={shloka.code} shloka={shloka} />
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-lg">
                    <CardHeader>
                      <CardTitle>{tab.emptyTitle}</CardTitle>
                      <CardDescription>{tab.emptyDescription}</CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>
    </AppShell>
  );
}

function ShlokaCard({ shloka }: { shloka: ApiTypes.LibraryShlokaDto }) {
  const excerpt = shloka.text.split("\n").filter(Boolean).slice(0, 2).join(" / ");

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{shloka.displayTitle}</CardTitle>
        <CardDescription>
          {shloka.sourceTitle} · {shloka.number}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-6">{excerpt}</p>
        {shloka.fullTranslation ? (
          <p className="text-sm leading-6 text-muted-foreground">{shloka.fullTranslation}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}
