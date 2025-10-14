import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

interface DocumentUploadDialogProps {
  dossierId: string;
  onDocumentUploaded: () => void;
}

// Removed DOC_TYPES - now using free text input

export function DocumentUploadDialog({ dossierId, onDocumentUploaded }: DocumentUploadDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    // Validation
    if (!file || !docType.trim()) {
      toast({
        title: "Ontbrekende gegevens",
        description: "Vul documenttype in en selecteer een bestand",
        variant: "destructive",
      });
      return;
    }

    // Document type length check
    if (docType.trim().length > 100) {
      toast({
        title: "Documenttype te lang",
        description: "Maximaal 100 karakters toegestaan",
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${dossierId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("dossier-documents")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload fout",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Create document record with free text doc_type
    const { error: dbError } = await supabase.from("documents").insert({
      dossier_id: dossierId,
      doc_type: docType.trim(), // Free text input
      file_name: file.name,
      file_url: fileName, // Store path, not public URL
      uploaded_by: userId,
      status: "IN_REVIEW",
    });

    if (dbError) {
      toast({
        title: "Database fout",
        description: dbError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Log event
    await supabase.from("dossier_events").insert({
      dossier_id: dossierId,
      event_type: "DOCUMENT_UPLOADED",
      event_description: `Document geüpload: ${file.name}`,
      created_by: userId,
      metadata: { doc_type: docType },
    });

    toast({
      title: "Document geüpload",
      description: "Het document is geüpload en wordt beoordeeld",
    });

    setOpen(false);
    setFile(null);
    setDocType("");
    setUploading(false);
    onDocumentUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
          <DialogDescription>
            Upload een document voor dit dossier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="docType">Documenttype</Label>
            <Input
              id="docType"
              placeholder={t("forms.placeholders.documentType")}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Geef een duidelijke naam voor het document
            </p>
          </div>
          <div>
            <Label>Bestand</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploaden..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
