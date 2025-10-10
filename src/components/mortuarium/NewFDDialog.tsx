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
      // BELANGRIJK: Voor provisional FDs moeten we eerst een auth user aanmaken
      // Split contact name into first and last name
      const nameParts = contactName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // 1. Maak eerst een echte auth user aan met tijdelijk wachtwoord
      const tempPassword = crypto.randomUUID(); // Random password
      
      console.log('🔧 Creating provisional FD user for:', contactEmail.trim());
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: contactEmail.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: contactPhone.trim(),
          },
        },
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('User creation failed');
      }

      console.log('✅ Provisional user created:', authData.user.id);

      // 2. Nu organization aanmaken met echte user_id
      const { data, error } = await supabase.rpc('fn_register_org_with_contact', {
        p_org_type: 'FD',
        p_company_name: fdName.trim(),
        p_business_number: null,
        p_email: contactEmail.trim(),
        p_contact_first_name: firstName,
        p_contact_last_name: lastName,
        p_user_id: authData.user.id, // ECHTE user_id
        p_phone: contactPhone.trim() || null,
        p_set_active: false
      });

      if (error) {
        console.error('❌ fn_register_org_with_contact error:', error);
        throw error;
      }
      
      console.log('✅ Provisional FD organization created');
      return data as { org_id: string; user_id: string };
    },
    onSuccess: (data) => {
      toast.success("Voorlopige FD succesvol aangemaakt");
      queryClient.invalidateQueries({ queryKey: ["fd-organizations"] });
      onFDCreated(data.org_id);
      handleClose();
    },
    onError: (error: any) => {
      toast.error("Fout bij aanmaken FD: " + error.message);
    },
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
