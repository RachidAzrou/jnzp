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
import { toast } from "sonner";

interface NewFDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFDCreated: (fdOrgId: string) => void;
}

export function NewFDDialog({ open, onOpenChange, onFDCreated }: NewFDDialogProps) {
  const { t } = useTranslation();
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
        throw new Error(error.message || 'Kon FD niet aanmaken');
      }

      if (!data?.success) {
        console.error('❌ Registration failed:', data);
        throw new Error(data?.error || 'Kon FD niet aanmaken');
      }

      const orgId = data.organizationId;
      console.log('✅ FD created successfully:', orgId);
      return orgId;
    },
    onSuccess: (orgId) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success("Nieuwe FD succesvol aangemaakt");
      handleClose();
      onFDCreated(orgId);
    },
    onError: (error: any) => {
      console.error('❌ Error creating FD:', error);
      const errorMsg = error?.message || String(error);
      toast.error(`Fout bij aanmaken FD: ${errorMsg}`);
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
      toast.error("Vul alle verplichte velden in");
      return;
    }

    if (!contactEmail.includes("@")) {
      toast.error("Voer een geldig e-mailadres in");
      return;
    }

    createFDMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nieuwe voorlopige FD aanmaken</DialogTitle>
            <DialogDescription>
              Maak een voorlopige uitvaartonderneming aan. Deze kan later door de admin
              geverifieerd worden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fd-name">
                Naam uitvaartonderneming <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fd-name"
                value={fdName}
                onChange={(e) => setFdName(e.target.value)}
                placeholder="Bijv. Uitvaart De Vos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-name">
                Naam contactpersoon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Voor- en achternaam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">
                E-mail contactpersoon <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="naam@bedrijf.nl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone">Telefoonnummer</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+32 ..."
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
              Annuleren
            </Button>
            <Button type="submit" disabled={createFDMutation.isPending}>
              {createFDMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
