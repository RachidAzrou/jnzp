import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadDialogProps {
  dossiers?: any[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUploadComplete: () => void;
}

export function DocumentUploadDialog({ 
  dossiers, 
  open: controlledOpen, 
  onOpenChange, 
  onUploadComplete 
}: DocumentUploadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [uploading, setUploading] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Fetch dossiers if not provided
  const [fetchedDossiers, setFetchedDossiers] = useState<any[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(!dossiers);

  useEffect(() => {
    if (!dossiers) {
      const fetchDossiers = async () => {
        const { data } = await supabase
          .from('dossiers')
          .select('id, ref_number, deceased_name')
          .order('created_at', { ascending: false });
        setFetchedDossiers(data || []);
        setLoadingDossiers(false);
      };
      fetchDossiers();
    }
  }, [dossiers]);

  const availableDossiers = dossiers || fetchedDossiers;

  const handleUpload = async () => {
    if (!file || !selectedDossier || !selectedType) {
      toast({
        title: "Velden vereist",
        description: "Selecteer een dossier, type en bestand.",
        variant: "destructive",
      });
      return;
    }

    // Client-side validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Bestand te groot",
        description: "Het bestand mag maximaal 10MB zijn",
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Ongeldig bestandstype",
        description: "Alleen PDF, JPG, PNG, DOC en DOCX bestanden zijn toegestaan",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const filePath = `${selectedDossier}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("dossier-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("dossier-documents")
        .getPublicUrl(filePath);

      // Create document record
      const { data: session } = await supabase.auth.getSession();
      const { error: dbError } = await supabase.from("documents").insert([{
        dossier_id: selectedDossier,
        doc_type: selectedType as any,
        file_url: publicUrl,
        file_name: file.name,
        status: "IN_REVIEW" as any,
        uploaded_by: session.session?.user.id
      }]);

      if (dbError) throw dbError;

      toast({
        title: "Document geüpload",
        description: "Het document is succesvol toegevoegd aan het dossier.",
      });

      setOpen(false);
      setFile(null);
      setSelectedDossier("");
      setSelectedType("");
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "Upload mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Document uploaden
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
          <DialogDescription>
            Upload een document voor een dossier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dossier">Dossier</Label>
            <Select value={selectedDossier} onValueChange={setSelectedDossier}>
              <SelectTrigger id="dossier">
                <SelectValue placeholder="Selecteer dossier" />
              </SelectTrigger>
              <SelectContent>
                {loadingDossiers ? (
                  <SelectItem value="loading" disabled>Laden...</SelectItem>
                ) : availableDossiers.length === 0 ? (
                  <SelectItem value="none" disabled>Geen dossiers beschikbaar</SelectItem>
                ) : (
                  availableDossiers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.ref_number} - {d.deceased_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Document type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecteer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEDICAL_ID">Medisch attest (IIIC/IIID)</SelectItem>
                <SelectItem value="MEDICAL_DEATH_CERTIFICATE">Medisch overlijdensbewijs</SelectItem>
                <SelectItem value="DEATH_CERTIFICATE">Overlijdensakte</SelectItem>
                <SelectItem value="TRANSPORT_PERMIT">Transportvergunning</SelectItem>
                <SelectItem value="LAISSEZ_PASSER">Laissez-passer</SelectItem>
                <SelectItem value="CONSULAR_LASSEZ_PASSER">Consulair laissez-passer</SelectItem>
                <SelectItem value="SEALING_CERTIFICATE">Verzegelbewijs</SelectItem>
                <SelectItem value="OTHER">Anders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Bestand</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploaden...
            </>
          ) : (
            "Uploaden"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
