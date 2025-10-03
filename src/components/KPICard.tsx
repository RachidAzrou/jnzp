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
    <Card className="shadow-md border-border/50 hover:shadow-lg transition-shadow overflow-hidden h-full flex flex-col min-h-[140px]">
      <CardContent className="pt-8 flex-1 flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate mb-3">{title}</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words line-clamp-2">{value}</p>
          </div>
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
