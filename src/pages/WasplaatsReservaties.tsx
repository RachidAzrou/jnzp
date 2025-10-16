import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { MortuariumCalendarView } from "@/components/wasplaats/MortuariumCalendarView";

export default function WasplaatsReservaties() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{t("mortuarium.reservations.bookings")}</p>
                  <h1 className="text-2xl font-bold tracking-tight">{t("mortuarium.reservations.title")}</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                {t("mortuarium.reservations.subtitle")}
              </p>
            </div>
          </CardContent>
        </Card>

        <MortuariumCalendarView />
      </div>
    </div>
  );
}
