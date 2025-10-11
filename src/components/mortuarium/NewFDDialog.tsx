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

      // 2. Explicitly create user profile
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_user_id: authData.user.id,
        p_email: contactEmail.trim(),
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: contactPhone.trim() || null
      });

      if (profileError) {
        console.error('❌ Profile creation failed:', profileError);
        throw new Error('Kon gebruikersprofiel niet aanmaken.');
      }

      console.log("✅ Profile created for FD user:", authData.user.id);

      // 3. Wait for session setup
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Nu organization aanmaken via v2 function (gebruikt auth.uid())
      const { data: result, error } = await supabase.rpc('fn_register_org_with_contact_v2', {
        p_org_type: 'FUNERAL_DIRECTOR',
        p_org_name: fdName.trim(),
        p_business_number: '',
        p_contact_first_name: firstName,
        p_contact_last_name: lastName,
        p_email: contactEmail.trim(),
        p_phone: contactPhone.trim() || ''
      });

      if (error) {
        console.error('❌ fn_register_org_with_contact_v2 error:', error);
        throw error;
      }
      
      const resultData = result as { success: boolean; organization_id: string; user_id: string } | null;
      
      if (!resultData?.success || !resultData?.organization_id) {
        throw new Error('Organization creation returned invalid response');
      }
      
      console.log('✅ Provisional FD organization created:', resultData.organization_id);
      return resultData.organization_id;
    },
    onSuccess: (orgId) => {
      toast.success("Voorlopige FD succesvol aangemaakt");
      queryClient.invalidateQueries({ queryKey: ["fd-organizations"] });
      onFDCreated(orgId);
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
