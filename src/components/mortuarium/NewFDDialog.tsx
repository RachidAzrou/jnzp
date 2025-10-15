import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewFDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFDCreated: (fdOrgId: string) => void;
}

export function NewFDDialog({ open, onOpenChange, onFDCreated }: NewFDDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fdName, setFdName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const createFDMutation = useMutation({
    mutationFn: async () => {
      console.log('🚀 Creating new FD via Edge Function:', {
        fdName,
        contactName,
        contactEmail,
        contactPhone
      });

      // Genereer tijdelijk wachtwoord
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      const [firstName, ...lastNameParts] = contactName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      // Call Edge Function (handles all user creation + rollback)
      const { data, error } = await supabase.functions.invoke('register-professional', {
        body: {
          email: contactEmail.trim(),
          password: tempPassword,
          firstName: firstName,
          lastName: lastName,
          phone: contactPhone.trim(),
          orgType: 'FUNERAL_DIRECTOR',
          orgName: fdName.trim(),
          businessNumber: undefined
        }
      });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || t("mortuarium.newFD.createError"));
      }

      if (!data?.success) {
        console.error('❌ Registration failed:', data);
        throw new Error(data?.error || t("mortuarium.newFD.createError"));
      }

      const orgId = data.organizationId;
      console.log('✅ FD created successfully:', orgId);
      return orgId;
    },
    onSuccess: (orgId) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({
        title: t("common.success"),
        description: t("mortuarium.newFD.fdCreated"),
      });
      handleClose();
      onFDCreated(orgId);
    },
    onError: (error: any) => {
      console.error('❌ Error creating FD:', error);
      const errorMsg = error?.message || String(error);
      toast({
        title: t("toasts.errors.createError"),
        description: errorMsg,
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setFdName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fdName.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast({
        title: t("toasts.errors.allFieldsRequiredShort"),
        variant: "destructive",
      });
      return;
    }

    if (!contactEmail.includes("@")) {
      toast({
        title: t("toasts.errors.invalidEmail"),
        variant: "destructive",
      });
      return;
    }

    createFDMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("mortuarium.newFD.title")}</DialogTitle>
            <DialogDescription>
              {t("mortuarium.newFD.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fd-name">
                {t("mortuarium.newFD.fdName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fd-name"
                value={fdName}
                onChange={(e) => setFdName(e.target.value)}
                placeholder={t("mortuarium.newFD.fdNamePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-name">
                {t("mortuarium.newFD.contactName")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t("mortuarium.newFD.contactNamePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">
                {t("mortuarium.newFD.contactEmail")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t("mortuarium.newFD.contactEmailPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t("mortuarium.newFD.contactPhone")}</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t("mortuarium.newFD.contactPhonePlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createFDMutation.isPending}
            >
              {t("mortuarium.newFD.cancel")}
            </Button>
            <Button type="submit" disabled={createFDMutation.isPending}>
              {createFDMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("mortuarium.newFD.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
