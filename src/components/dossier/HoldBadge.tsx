import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, X } from "lucide-react";
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
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HoldBadgeProps {
  type: "LEGAL" | "INSURER";
  reason?: string;
  authority?: string;
  contactPerson?: string;
  reference?: string;
  dossierId: string;
  canLift?: boolean;
  onLift?: () => void;
}

export function HoldBadge({
  type,
  reason,
  authority,
  contactPerson,
  reference,
  dossierId,
  canLift,
  onLift,
}: HoldBadgeProps) {
  const [liftReason, setLiftReason] = useState("");
  const [isLifting, setIsLifting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const isLegal = type === "LEGAL";

  const handleLift = async () => {
    if (!liftReason.trim()) {
      toast({
        variant: "destructive",
        title: "Reden verplicht",
        description: "Geef een reden op voor het opheffen van de blokkade",
      });
      return;
    }

    setIsLifting(true);
    try {
      const { data, error } = await supabase.rpc("lift_dossier_hold", {
        p_dossier_id: dossierId,
        p_hold_type: type,
        p_reason: liftReason,
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string };
      if (!result?.success) {
        throw new Error(result?.error || "Kon blokkade niet opheffen");
      }

      toast({
        title: "Blokkade opgeheven",
        description: `${isLegal ? "Juridische" : "Verzekeraar"} blokkade is succesvol opgeheven`,
      });

      setDialogOpen(false);
      setLiftReason("");
      onLift?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout bij opheffen blokkade",
        description: error.message,
      });
    } finally {
      setIsLifting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1.5 cursor-pointer ${
            isLegal
              ? "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800"
              : "bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-800"
          }`}
        >
          {isLegal ? (
            <Shield className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {isLegal ? "Juridische blokkade" : "Verzekeraar-blokkade"}
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLegal ? "Juridische blokkade" : "Verzekeraar-blokkade"}
          </DialogTitle>
          <DialogDescription>Details van de blokkade</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <p className={`font-medium ${isLegal ? "text-red-600" : "text-orange-600"}`}>
              {isLegal
                ? "Geblokkeerd door overheid/parket"
                : "Geblokkeerd door verzekeraar"}
            </p>
          </div>

          {reason && (
            <div>
              <Label className="text-muted-foreground">Reden</Label>
              <p className="text-sm">{reason}</p>
            </div>
          )}

          {isLegal && authority && (
            <div>
              <Label className="text-muted-foreground">Autoriteit</Label>
              <p className="text-sm">{authority}</p>
            </div>
          )}

          {!isLegal && contactPerson && (
            <div>
              <Label className="text-muted-foreground">Contactpersoon</Label>
              <p className="text-sm">{contactPerson}</p>
            </div>
          )}

          {reference && (
            <div>
              <Label className="text-muted-foreground">
                {isLegal ? "Zaaknummer" : "Referentie"}
              </Label>
              <p className="text-sm">{reference}</p>
            </div>
          )}

          {canLift && (
            <div className="pt-4 border-t">
              <Label htmlFor="lift-reason">Reden voor opheffen *</Label>
              <Textarea
                id="lift-reason"
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                placeholder="Waarom wordt deze blokkade opgeheven?"
                className="mt-2"
              />
            </div>
          )}
        </div>

        {canLift && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isLifting}
            >
              Annuleren
            </Button>
            <Button onClick={handleLift} disabled={isLifting}>
              {isLifting ? "Bezig..." : "Blokkade opheffen"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
