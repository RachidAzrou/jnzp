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
      console.log('🚀 Creating new FD with data:', {
        fdName,
        contactName,
        contactEmail,
        contactPhone
      });

      // Genereer tijdelijk wachtwoord
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
      const [firstName, ...lastNameParts] = contactName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      // STAP 1: Maak auth user aan
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: contactEmail.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (authError) {
        console.error('❌ Auth signup failed:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Kon gebruiker niet aanmaken");
      }

      console.log('✅ Auth user created:', authData.user.id);

      // STAP 2: Registreer via atomische RPC functie
      const { data: result, error: rpcError } = await supabase.rpc('register_professional_user', {
        p_user_id: authData.user.id,
        p_email: contactEmail.trim(),
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: contactPhone.trim(),
        p_org_type: 'FUNERAL_DIRECTOR',
        p_org_name: fdName.trim(),
        p_business_number: null // Ad-hoc FD heeft geen business number nodig
      });

      if (rpcError) {
        console.error('❌ Registration RPC failed:', rpcError);
        throw new Error(rpcError.message || 'Kon FD niet aanmaken');
      }

      const resultData = result as { success: boolean; organization_id: string; error?: string } | null;

      if (!resultData || !resultData.success) {
        console.error('❌ Registration failed:', resultData);
        throw new Error(resultData?.error || 'Kon FD niet aanmaken');
      }

      const orgId = resultData.organization_id;
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
