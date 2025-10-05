import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ExternalInvoiceUploadProps {
  dossierId: string;
  onUploaded: () => void;
}

export function ExternalInvoiceUpload({ dossierId, onUploaded }: ExternalInvoiceUploadProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [supplier, setSupplier] = useState("");

  const handleUpload = async () => {
    if (!file || !description.trim() || !supplier.trim()) {
      toast({
        title: t("externalInvoice.incompleteData"),
        description: t("externalInvoice.incompleteDataDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      // Get dossier info
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("insurer_org_id")
        .eq("id", dossierId)
        .single();

      if (!dossier?.insurer_org_id) {
        toast({
          title: t("externalInvoice.uploadError"),
          description: t("externalInvoice.noInsurer"),
          variant: "destructive",
        });
        return;
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}/${Date.now()}-${supplier.replace(/\s+/g, '-')}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("dossier-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("dossier-documents")
        .getPublicUrl(fileName);

      // Create external invoice record
      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          dossier_id: dossierId,
          fd_org_id: userRole.organization_id,
          facility_org_id: userRole.organization_id,
          is_external: true,
          external_file_url: publicUrl,
          external_file_name: file.name,
          uploaded_by: user.id,
          status: "DRAFT",
          subtotal: amount ? parseFloat(amount) : 0,
          vat: 0,
          total: amount ? parseFloat(amount) : 0,
          notes: `Externe factuur: ${supplier} - ${description}`,
        });

      if (invoiceError) throw invoiceError;

      // Log event
      await supabase.from("dossier_events").insert({
        dossier_id: dossierId,
        event_type: "EXTERNAL_INVOICE_UPLOADED",
        event_description: `Externe factuur geüpload: ${supplier} - ${description}`,
        created_by: user.id,
        metadata: {
          supplier,
          description,
          amount: amount || null,
          file_name: file.name,
        },
      });

      toast({
        title: t("externalInvoice.uploadSuccess"),
        description: t("externalInvoice.uploadSuccessDesc", { supplier }),
      });

      setOpen(false);
      setFile(null);
      setDescription("");
      setAmount("");
      setSupplier("");
      onUploaded();
    } catch (error: any) {
      console.error("Error uploading external invoice:", error);
      toast({
        title: t("externalInvoice.uploadError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          {t("externalInvoice.upload")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("externalInvoice.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("externalInvoice.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="supplier">{t("externalInvoice.supplier")} *</Label>
            <Input
              id="supplier"
              placeholder={t("externalInvoice.supplierPlaceholder")}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">{t("externalInvoice.description")} *</Label>
            <Textarea
              id="description"
              placeholder={t("externalInvoice.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="amount">{t("externalInvoice.amount")}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="450.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="file">{t("externalInvoice.file")} *</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            {t("externalInvoice.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                {t("externalInvoice.uploadButton")}...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("externalInvoice.uploadButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
