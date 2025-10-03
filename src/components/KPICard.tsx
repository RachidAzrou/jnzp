import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function KPICard({ title, value, icon: Icon, trend }: KPICardProps) {
  return (
    <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col">
      <CardContent className="pt-8 flex-1 flex items-center">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate mb-2">{title}</p>
            <p className="text-4xl font-bold mt-3 tracking-tight">{value}</p>
            {trend && (
              <p className={`text-sm mt-3 font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-8 w-8 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
