import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { authenticator } from "otplib";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({ onVerified, onCancel }: TwoFactorVerificationProps) => {
  const [code, setCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!code || (isRecoveryMode ? code.length !== 8 : code.length !== 6)) {
      toast({
        title: "Ongeldige code",
        description: isRecoveryMode 
          ? "Voer een 8-cijferige recovery code in."
          : "Voer een 6-cijferige code in.",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Fout",
        description: "Geen gebruiker gevonden.",
        variant: "destructive",
      });
      setVerifying(false);
      return;
    }

    // Get user's 2FA settings
    const { data: settings } = await supabase
      .from("user_2fa_settings")
      .select("totp_secret, recovery_codes")
      .eq("user_id", user.id)
      .single();

    if (!settings) {
      toast({
        title: "Fout",
        description: "2FA instellingen niet gevonden.",
        variant: "destructive",
      });
      setVerifying(false);
      return;
    }

    let isValid = false;

    if (isRecoveryMode) {
      // Check if recovery code is valid
      isValid = settings.recovery_codes?.includes(code.toUpperCase()) || false;
      
      if (isValid) {
        // Remove used recovery code
        const updatedCodes = settings.recovery_codes.filter(
          (c: string) => c !== code.toUpperCase()
        );
        await supabase
          .from("user_2fa_settings")
          .update({ recovery_codes: updatedCodes })
          .eq("user_id", user.id);
      }
    } else {
      // Verify TOTP code
      isValid = authenticator.verify({
        token: code,
        secret: settings.totp_secret || "",
      });
    }

    if (!isValid) {
      toast({
        title: "Ongeldige code",
        description: "De verificatiecode is onjuist. Probeer opnieuw.",
        variant: "destructive",
      });
      setVerifying(false);
      return;
    }

    // Update last verified timestamp
    await supabase
      .from("user_2fa_settings")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("user_id", user.id);

    toast({
      title: "Verificatie succesvol",
      description: "U wordt ingelogd...",
    });

    onVerified();
    setVerifying(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle>Tweefactorauthenticatie</CardTitle>
        <CardDescription>
          {isRecoveryMode 
            ? "Voer een recovery code in"
            : "Voer de 6-cijferige code in uit uw authenticator app"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="2faCode">
            {isRecoveryMode ? "Recovery Code" : "Verificatiecode"}
          </Label>
          <Input
            id="2faCode"
            placeholder={isRecoveryMode ? "XXXXXXXX" : "000000"}
            value={code}
            onChange={(e) => setCode(
              isRecoveryMode 
                ? e.target.value.toUpperCase().slice(0, 8)
                : e.target.value.replace(/\D/g, '').slice(0, 6)
            )}
            maxLength={isRecoveryMode ? 8 : 6}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleVerify} 
            disabled={verifying || (!isRecoveryMode && code.length !== 6) || (isRecoveryMode && code.length !== 8)}
            className="w-full"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verifiëren
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => setIsRecoveryMode(!isRecoveryMode)}
            className="w-full"
          >
            {isRecoveryMode ? "Gebruik authenticator app" : "Gebruik recovery code"}
          </Button>

          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full"
          >
            Annuleren
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
