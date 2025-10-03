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
    <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">{value}</p>
            {trend && (
              <p className={`text-xs mt-2 font-medium ${trend.positive ? 'text-success' : 'text-destructive'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
