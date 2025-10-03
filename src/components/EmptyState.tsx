import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon | IconType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-2xl bg-muted/50 p-8 mb-6 border border-border/50">
        <Icon className="h-16 w-16 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="shadow-sm">{action.label}</Button>
      )}
    </div>
  );
}
