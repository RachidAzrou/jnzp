import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

type ReservationDetails = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  note: string | null;
  dossier: {
    id: string;
    display_id: string;
    deceased_name: string;
    ref_number: string;
    status: string;
  } | null;
  organization: {
    name: string;
  } | null;
};

type CoolCellReservationSheetProps = {
  reservationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CoolCellReservationSheet({
  reservationId,
  open,
  onOpenChange,
}: CoolCellReservationSheetProps) {
  const { t } = useTranslation();
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reservationId && open) {
      fetchReservationDetails();
    }
  }, [reservationId, open]);

  const fetchReservationDetails = async () => {
    if (!reservationId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cool_cell_reservations")
        .select(`
          id,
          start_at,
          end_at,
          status,
          note,
          dossier:dossiers (
            id,
            display_id,
            deceased_name,
            ref_number,
            status
          ),
          organization:organizations!cool_cell_reservations_facility_org_id_fkey (
            name
          )
        `)
        .eq("id", reservationId)
        .single();

      if (error) throw error;
      setReservation(data as any);
    } catch (error) {
      console.error("Error fetching reservation details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-warning text-warning-foreground";
      case "CONFIRMED":
        return "bg-primary text-primary-foreground";
      case "OCCUPIED":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "In afwachting";
      case "CONFIRMED":
        return "Bevestigd";
      case "OCCUPIED":
        return "Bezet";
      default:
        return status;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Reserveringsdetails</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : reservation ? (
          <div className="space-y-6 mt-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("coolCell.status")}</h3>
              <Badge className={getStatusColor(reservation.status)}>
                {getStatusLabel(reservation.status)}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("coolCell.period")}</h3>
              <p className="text-sm">
                {format(new Date(reservation.start_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
              <p className="text-sm text-muted-foreground">{t("coolCell.until")}</p>
              <p className="text-sm">
                {format(new Date(reservation.end_at), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
              </p>
            </div>

            {reservation.organization && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("coolCell.funeralHome")}
                </h3>
                <p className="text-sm font-medium">{reservation.organization.name}</p>
              </div>
            )}

            {reservation.dossier && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium">{t("coolCell.dossierInfo")}</h3>
                
                <div>
                  <p className="text-sm text-muted-foreground">{t("coolCell.dossierId")}</p>
                  <p className="text-sm font-medium">{reservation.dossier.display_id || reservation.dossier.ref_number}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("coolCell.deceased")}</p>
                  <p className="text-sm font-medium">{reservation.dossier.deceased_name}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">{t("coolCell.dossierStatus")}</p>
                  <Badge variant="outline">{reservation.dossier.status}</Badge>
                </div>
              </div>
            )}

            {reservation.note && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("coolCell.note")}</h3>
                <p className="text-sm">{reservation.note}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-6">{t("coolCell.noDetails")}</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
