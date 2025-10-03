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
    <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col min-h-[160px]">
      <CardContent className="pt-8 flex-1 flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-2">{title}</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold mt-2 tracking-tight break-words">{value}</p>
            {trend && (
              <p className={`text-xs sm:text-sm mt-2 font-medium truncate ${trend.positive ? 'text-success' : 'text-destructive'}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
