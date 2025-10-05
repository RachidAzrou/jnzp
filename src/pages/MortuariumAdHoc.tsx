import { AdHocDossierWizard } from "@/components/mortuarium/AdHocDossierWizard";
import { useTranslation } from "react-i18next";

export default function MortuariumAdHoc() {
  const { t } = useTranslation();
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("mortuarium.adHoc.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("mortuarium.adHoc.description")}
        </p>
      </div>
      
      <AdHocDossierWizard />
    </div>
  );
}
