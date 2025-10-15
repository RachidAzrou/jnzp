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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [uploading, setUploading] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Fetch dossiers if not provided
  const [fetchedDossiers, setFetchedDossiers] = useState<any[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(!dossiers);

  useEffect(() => {
    if (!dossiers) {
      const fetchDossiers = async () => {
        // Get user's organization(s)
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        
        const orgIds = userRoles?.map(r => r.organization_id).filter(Boolean) || [];
        
        if (orgIds.length === 0) {
          setFetchedDossiers([]);
          setLoadingDossiers(false);
          return;
        }
        
        // Fetch only assigned dossiers from user's organization(s) - not released or deleted
        const { data } = await supabase
          .from('dossiers')
          .select('id, ref_number, deceased_name, display_id, assignment_status, assigned_fd_org_id')
          .in('assigned_fd_org_id', orgIds)
          .eq('assignment_status', 'ASSIGNED')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        setFetchedDossiers(data || []);
        setLoadingDossiers(false);
      };
      fetchDossiers();
    }
  }, [dossiers]);

  const availableDossiers = dossiers || fetchedDossiers;

  const handleUpload = async () => {
    if (!file || !selectedDossier || !docType.trim()) {
      toast({
        title: t("documentUploadDialog.fieldsRequired"),
        description: t("documentUploadDialog.fieldsRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    // Client-side validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t("documentUploadDialog.fileTooLarge"),
        description: t("documentUploadDialog.fileTooLargeDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: t("documentUploadDialog.invalidFileType"),
        description: t("documentUploadDialog.invalidFileTypeDesc"),
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

      // Store file path only - signed URLs will be generated on-demand for security
      // Create document record
      const { data: session } = await supabase.auth.getSession();
      const { error: dbError } = await supabase.from("documents").insert({
        dossier_id: selectedDossier,
        doc_type: docType.trim(),
        file_url: filePath,
        file_name: file.name,
        status: "IN_REVIEW",
        uploaded_by: session.session?.user.id
      });

      if (dbError) throw dbError;

      toast({
        title: t("documentUploadDialog.uploadSuccess"),
        description: t("documentUploadDialog.uploadSuccessDesc"),
      });

      setOpen(false);
      setFile(null);
      setSelectedDossier("");
      setDocType("");
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: t("documentUploadDialog.uploadFailed"),
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
            {t("documentUploadDialog.uploadButton")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("documentUploadDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("documentUploadDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dossier">{t("documentUpload.dossier")}</Label>
            <Select value={selectedDossier} onValueChange={setSelectedDossier}>
              <SelectTrigger id="dossier">
                <SelectValue placeholder={t("documentUpload.selectDossier")} />
              </SelectTrigger>
              <SelectContent>
                {loadingDossiers ? (
                  <SelectItem value="loading" disabled>{t("documentUpload.loading")}</SelectItem>
                ) : availableDossiers.length === 0 ? (
                  <SelectItem value="none" disabled>{t("documentUpload.noDossiers")}</SelectItem>
                ) : (
                  availableDossiers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.display_id || d.ref_number} - {d.deceased_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t("documentUploadDialog.documentType")}</Label>
            <Input
              id="type"
              placeholder={t("documentUploadDialog.documentTypePlaceholder")}
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {t("documentUploadDialog.documentTypeHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">{t("documentUploadDialog.file")}</Label>
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
              {t("documentUploadDialog.uploading")}
            </>
          ) : (
            t("documentUploadDialog.upload")
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
