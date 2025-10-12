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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle } from "lucide-react";

interface SetHoldDialogProps {
  dossierId: string;
  isAdmin?: boolean;
  isInsurer?: boolean;
  onHoldSet?: () => void;
}

export function SetHoldDialog({
  dossierId,
  isAdmin,
  isInsurer,
  onHoldSet,
}: SetHoldDialogProps) {
  const [open, setOpen] = useState(false);
  const [holdType, setHoldType] = useState<"LEGAL" | "INSURER">(
    isAdmin ? "LEGAL" : "INSURER"
  );
  const [reason, setReason] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Alleen admin kan legal holds zetten, alleen verzekeraar kan insurer holds zetten
  const canSetLegal = isAdmin;
  const canSetInsurer = isInsurer || isAdmin;

  if (!canSetLegal && !canSetInsurer) {
    return null;
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        variant: "destructive",
        title: "Reden verplicht",
        description: "Geef een reden op voor de blokkade",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("set_dossier_hold", {
        p_dossier_id: dossierId,
        p_hold_type: holdType,
        p_reason: reason,
        p_contact_person: contactPerson || null,
        p_reference: reference || null,
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || "Kon blokkade niet zetten");
      }

      toast({
        title: "Blokkade geactiveerd",
        description: `${
          holdType === "LEGAL" ? "Juridische" : "Verzekeraar"
        } blokkade is succesvol gezet`,
      });

      setOpen(false);
      setReason("");
      setContactPerson("");
      setReference("");
      onHoldSet?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout bij zetten blokkade",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Blokkade zetten
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dossier blokkeren</DialogTitle>
          <DialogDescription>
            Zet een blokkade op dit dossier om bepaalde acties te beperken
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canSetLegal && canSetInsurer && (
            <div>
              <Label>Type blokkade</Label>
              <RadioGroup
                value={holdType}
                onValueChange={(val) => setHoldType(val as "LEGAL" | "INSURER")}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LEGAL" id="legal" />
                  <Label htmlFor="legal" className="cursor-pointer flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-600" />
                    Juridische blokkade (alle acties)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INSURER" id="insurer" />
                  <Label htmlFor="insurer" className="cursor-pointer flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Verzekeraar-blokkade (financiële acties)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reden *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Waarom wordt dit dossier geblokkeerd?"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="contact">
              {holdType === "LEGAL" ? "Autoriteit/Parket" : "Contactpersoon"}
            </Label>
            <Input
              id="contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder={
                holdType === "LEGAL"
                  ? "Naam van parket of autoriteit"
                  : "Naam contactpersoon verzekeraar"
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="reference">
              {holdType === "LEGAL" ? "Zaaknummer" : "Referentienummer"}
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                holdType === "LEGAL" ? "PV-nummer of zaaknummer" : "Referentie verzekeraar"
              }
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Bezig..." : "Blokkade activeren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
