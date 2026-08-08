import { Card, CardHeader } from "@/shared/ui/card";

import { Typography } from "./typography";

export type StatusCardProps = {
  description?: string | undefined;
  title: string;
};

export function StatusCard({ description, title }: StatusCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <Typography as="div" variant="h3">
          {title}
        </Typography>
        {description ? (
          <Typography as="div" tone="muted" variant="p2">
            {description}
          </Typography>
        ) : null}
      </CardHeader>
    </Card>
  );
}
