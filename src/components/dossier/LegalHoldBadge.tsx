import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Scale, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface LegalHoldBadgeProps {
  legal_hold_active: boolean;
  legal_hold_authority?: string | null;
  legal_hold_case_number?: string | null;
  onViewDetails?: () => void;
}

export function LegalHoldBadge({
  legal_hold_active,
  legal_hold_authority,
  legal_hold_case_number,
  onViewDetails,
}: LegalHoldBadgeProps) {
  const { t } = useTranslation();
  
  if (!legal_hold_active) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 px-3 py-1.5 text-xs sm:text-sm font-medium cursor-help transition-colors"
            role="status"
            aria-label={t("legalHold.ariaLabel")}
          >
            <Scale className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" aria-hidden="true" />
            <span>{t("legalHold.active")}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          className="max-w-[320px] p-4 bg-card border shadow-lg"
          role="tooltip"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Scale className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm mb-1">{t("legalHold.title")}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("legalHold.description")}
                </p>
              </div>
            </div>

            {(legal_hold_authority || legal_hold_case_number) && (
              <div className="space-y-2 pt-2 border-t">
                {legal_hold_authority && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{t("legalHold.authority")}</span>
                    <span className="text-sm font-medium">{legal_hold_authority}</span>
                  </div>
                )}
                {legal_hold_case_number && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">{t("legalHold.caseNumber")}</span>
                    <span className="text-sm font-medium font-mono">{legal_hold_case_number}</span>
                  </div>
                )}
              </div>
            )}

            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewDetails}
                className="w-full mt-2 text-xs hover:bg-amber-50"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                {t("legalHold.viewDetails")}
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
