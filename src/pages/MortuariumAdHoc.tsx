import { AdHocDossierWizard } from "@/components/mortuarium/AdHocDossierWizard";

export default function MortuariumAdHoc() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Ad-hoc Dossier Aanmaken</h1>
        <p className="text-muted-foreground mt-2">
          Maak snel een nieuw dossier aan met koelcel-toewijzing en uitvaartondernemer
        </p>
      </div>
      
      <AdHocDossierWizard />
    </div>
  );
}
