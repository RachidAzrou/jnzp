import { AdHocDossierWizard } from "@/components/mortuarium/AdHocDossierWizard";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function MortuariumAdHoc() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/mortuarium")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug naar dashboard
        </Button>
        <h1 className="text-3xl font-bold">{t("mortuarium.adHoc.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("mortuarium.adHoc.description")}
        </p>
      </div>
      
      <AdHocDossierWizard />
    </div>
  );
}
