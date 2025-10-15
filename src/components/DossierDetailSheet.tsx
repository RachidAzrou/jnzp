import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, FileText, Plane, Building2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface DossierDetailSheetProps {
  dossier: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DossierDetailSheet({ dossier, open, onOpenChange }: DossierDetailSheetProps) {
  const { t } = useTranslation();
  
  if (!dossier) return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      CREATED: t("claimDossier.statusCreated"),
      IN_PROGRESS: t("claimDossier.statusInProgress"),
      UNDER_REVIEW: t("claimDossier.statusUnderReview"),
      COMPLETED: t("claimDossier.statusCompleted"),
      CLOSED: t("claimDossier.statusClosed"),
    };
    return labels[status.toUpperCase()] || status.replace(/_/g, " ");
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      CREATED: "secondary",
      IN_PROGRESS: "default",
      UNDER_REVIEW: "default",
      COMPLETED: "default",
      CLOSED: "secondary",
    };
    return colors[status.toUpperCase()] || "secondary";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "d MMMM yyyy", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
          <div>
            <SheetTitle className="text-2xl">{t("common.dossier")} {dossier.ref_number}</SheetTitle>
            <SheetDescription>{dossier.deceased_name}</SheetDescription>
          </div>
            <Badge 
              variant={getStatusColor(dossier.status)}
              className={`min-w-[120px] justify-center ${
                getStatusColor(dossier.status) !== "destructive" ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : ""
              }`}
            >
              {getStatusLabel(dossier.status)}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Legal Hold Warning */}
          {dossier.legal_hold && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">{t("dossierDetail.legalHoldActive")}</h4>
                <p className="text-sm text-destructive/80 mt-1">
                  {t("dossierDetail.legalHoldMessage", { 
                    reason: dossier.require_doc_ref || t("dossierDetail.legalHoldDefault")
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Overledene Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("dossierDetail.deceasedTitle")}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t("dossierDetail.name")}</p>
                <p className="font-medium">{dossier.deceased_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("dossierDetail.dateOfBirth")}</p>
                <p className="font-medium">{formatDate(dossier.deceased_dob)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("dossierDetail.dateOfDeath")}</p>
                <p className="font-medium">{formatDate(dossier.date_of_death)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("dossierDetail.dossierCreated")}</p>
                <p className="font-medium">{formatDate(dossier.created_at)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Organisaties */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("dossierDetail.involvedParties")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">{t("dossierDetail.funeralDirector")}</p>
                  <p className="font-medium">
                    {dossier.assigned_fd_org_id ? t("dossierDetail.assigned") : t("dossierDetail.notAssigned")}
                  </p>
                </div>
                {dossier.assigned_fd_org_id && (
                  <Badge variant="outline">{t("dossierDetail.active")}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-muted-foreground text-xs">{t("dossierDetail.insurer")}</p>
                  <p className="font-medium">
                    {dossier.insurer_org_id ? t("dossierDetail.linked") : t("dossierDetail.notLinked")}
                  </p>
                </div>
                {dossier.insurer_org_id && (
                  <Badge variant="outline">{t("dossierDetail.active")}</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Timeline */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t("dossierDetail.statusOverview")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${dossier.legal_hold ? 'bg-destructive' : 'bg-success'}`} />
                <span className="text-sm">
                  {dossier.legal_hold ? t("dossierDetail.legalHoldActive") : t("dossierDetail.noBlocks")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">{t("dossierDetail.currentStatus")}: {getStatusLabel(dossier.status)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("dossierDetail.lastUpdated")}: {formatDate(dossier.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {dossier.require_doc_ref && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">{t("dossierDetail.requiredDocumentation")}</h3>
                <p className="text-sm text-muted-foreground">{dossier.require_doc_ref}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
