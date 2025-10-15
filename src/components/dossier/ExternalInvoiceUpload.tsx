import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface Props {
  dossierId: string;
  onUploadComplete: () => void;
}

export function ExternalInvoiceUpload({ dossierId, onUploadComplete }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "ISSUED" | "PAID">("DRAFT");

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: t("externalInvoice.error"),
        description: t("externalInvoice.selectFile"),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("externalInvoice.notLoggedIn"));

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) throw new Error(t("externalInvoice.noOrganization"));

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dossierId}-${Date.now()}.${fileExt}`;
      const filePath = `external-invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dossier-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Store file path only - signed URLs will be generated on-demand for security

      // Create external invoice record
      const { error: insertError } = await supabase
        .from("invoices")
        .insert([{
          dossier_id: dossierId,
          fd_org_id: userRole.organization_id,
          facility_org_id: userRole.organization_id,
          is_external: true,
          external_file_url: filePath, // Store path, not public URL
          external_file_name: file.name,
          uploaded_by: user.id,
          status,
          total: amount ? parseFloat(amount) : 0,
          subtotal: amount ? parseFloat(amount) / 1.21 : 0,
          vat: amount ? parseFloat(amount) - (parseFloat(amount) / 1.21) : 0,
          notes: description,
        }]);

      if (insertError) throw insertError;

      toast({
        title: t("externalInvoice.success"),
        description: t("externalInvoice.successDesc"),
      });

      setOpen(false);
      setFile(null);
      setDescription("");
      setAmount("");
      setStatus("DRAFT");
      onUploadComplete();
    } catch (error: any) {
      console.error("Error uploading invoice:", error);
      toast({
        title: t("externalInvoice.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          {t("externalInvoice.uploadButton")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("externalInvoice.title")}</DialogTitle>
        </DialogHeader>
          <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file">{t("externalInvoice.fileLabel")}</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("externalInvoice.descriptionLabel")}</Label>
            <Textarea
              id="description"
              placeholder={t("forms.placeholders.invoiceDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">{t("externalInvoice.amountLabel")}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder={t("forms.placeholders.amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">{t("externalInvoice.statusLabel")}</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as "DRAFT" | "ISSUED" | "PAID")}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{t("externalInvoice.statusDraft")}</SelectItem>
                <SelectItem value="ISSUED">{t("externalInvoice.statusIssued")}</SelectItem>
                <SelectItem value="PAID">{t("externalInvoice.statusPaid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("externalInvoice.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("externalInvoice.uploading") : t("externalInvoice.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
