import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface DocumentUploadDialogProps {
  dossierId: string;
  onDocumentUploaded: () => void;
}

const DOC_TYPES = [
  { value: "ID_CARD", label: "Identiteitsbewijs" },
  { value: "DEATH_CERTIFICATE", label: "Overlijdensakte" },
  { value: "INSURANCE_POLICY", label: "Verzekeringspolis" },
  { value: "BURIAL_PERMIT", label: "Vergunning" },
  { value: "OTHER", label: "Overig" },
];

export function DocumentUploadDialog({ dossierId, onDocumentUploaded }: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !docType) {
      toast({
        title: "Incomplete",
        description: "Selecteer een document type en bestand",
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("dossier-documents")
      .getPublicUrl(fileName);

    // Create document record
    const { error: dbError } = await supabase.from("documents").insert({
      doc_type: docType as any,
      file_name: file.name,
      file_url: publicUrl,
      uploaded_by: userId,
      status: "IN_REVIEW",
    } as any);

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
          <div>
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer type" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
