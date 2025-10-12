import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Clock, FileText } from "lucide-react";

interface PolicyVerificationBadgeProps {
  verificationMethod?: "API" | "MANUAL" | "PENDING" | null;
  verifiedAt?: string | null;
  policyNumber?: string;
}

export function PolicyVerificationBadge({ 
  verificationMethod, 
  verifiedAt,
  policyNumber 
}: PolicyVerificationBadgeProps) {
  if (!verificationMethod) return null;

  const badges = {
    API: {
      icon: CheckCircle2,
      label: "Polis bevestigd door verzekeraar",
      variant: "default" as const,
      className: "bg-emerald-500/10 text-emerald-700 border-emerald-200"
    },
    MANUAL: {
      icon: FileText,
      label: "Polis handmatig bevestigd",
      variant: "secondary" as const,
      className: "bg-blue-500/10 text-blue-700 border-blue-200"
    },
    PENDING: {
      icon: Clock,
      label: "Polis nog te controleren",
      variant: "outline" as const,
      className: "bg-yellow-500/10 text-yellow-700 border-yellow-200"
    }
  };

  const config = badges[verificationMethod];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1.5 ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
      {policyNumber && <span className="ml-1 opacity-70">({policyNumber})</span>}
    </Badge>
  );
}
