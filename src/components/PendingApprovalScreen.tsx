import { AlertCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

interface PendingApprovalScreenProps {
  status: "PENDING_VERIFICATION" | "REJECTED";
  organizationName?: string;
  rejectionReason?: string;
}

export const PendingApprovalScreen = ({ 
  status, 
  organizationName,
  rejectionReason 
}: PendingApprovalScreenProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Note: No automatic logout - only via button
  // This prevents logout loops when the component briefly mounts during loading

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {status === "PENDING_VERIFICATION" ? (
          <>
            <div className="flex justify-center">
              <Clock className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Wachten op goedkeuring
              </h1>
              {organizationName && (
                <p className="text-sm text-muted-foreground">
                  Organisatie: <span className="font-medium">{organizationName}</span>
                </p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Je registratie is ontvangen en wordt momenteel beoordeeld door onze beheerders.
              </p>
              <p className="text-muted-foreground">
                Je ontvangt een e-mail zodra je account is goedgekeurd.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Dit kan enkele werkdagen duren. Je kunt deze pagina sluiten en later terugkomen.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Registratie afgekeurd
              </h1>
              {organizationName && (
                <p className="text-sm text-muted-foreground">
                  Organisatie: <span className="font-medium">{organizationName}</span>
                </p>
              )}
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Helaas is je registratie niet goedgekeurd.
              </p>
              {rejectionReason && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">Reden:</p>
                  <p className="text-sm text-muted-foreground">{rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Neem contact op met support voor meer informatie.
              </p>
            </div>
          </>
        )}

        <Button 
          onClick={handleLogout}
          variant="outline"
          className="w-full"
        >
          Uitloggen
        </Button>
      </Card>
    </div>
  );
};
