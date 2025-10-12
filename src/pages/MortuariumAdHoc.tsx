import { AdHocDossierWizard } from "@/components/mortuarium/AdHocDossierWizard";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function MortuariumAdHoc() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/mortuarium")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar dashboard
        </Button>
        
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Ad-hoc aanmelding</p>
                    <h1 className="text-2xl font-bold tracking-tight">{t("mortuarium.adHoc.title")}</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
                  {t("mortuarium.adHoc.description")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <AdHocDossierWizard />
      </div>
    </div>
  );
}
