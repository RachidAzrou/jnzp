import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TbAuth2Fa } from "react-icons/tb";
import * as OTPAuth from "otpauth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
  userId: string;
  userEmail: string;
}

export const TwoFactorVerification = ({ onVerified, onCancel, userId, userEmail }: TwoFactorVerificationProps) => {
  const [code, setCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    console.log("=== 2FA Verification Start ===");
    console.log("Code entered:", code);
    console.log("Is recovery mode:", isRecoveryMode);
    
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

    try {
      console.log("=== 2FA Verification Start ===");
      console.log("User ID:", userId);
      console.log("User Email:", userEmail);
      console.log("Code entered:", code);
      console.log("Is recovery mode:", isRecoveryMode);
      // Get user's 2FA settings using the provided userId
      const { data: settings, error: settingsError } = await supabase
        .from("user_2fa_settings")
        .select("totp_secret, recovery_codes")
        .eq("user_id", userId)
        .maybeSingle();
      
      console.log("2FA settings fetched:", settings, "Error:", settingsError);

      if (!settings || settingsError) {
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
        console.log("Checking recovery code...");
        // Check if recovery code is valid
        isValid = settings.recovery_codes?.includes(code.toUpperCase()) || false;
        console.log("Recovery code valid:", isValid);
        
        if (isValid) {
          // Remove used recovery code
          const updatedCodes = settings.recovery_codes.filter(
            (c: string) => c !== code.toUpperCase()
          );
          await supabase
            .from("user_2fa_settings")
            .update({ recovery_codes: updatedCodes })
            .eq("user_id", userId);
        }
      } else {
        console.log("Verifying TOTP code...");
        console.log("Secret from DB:", settings.totp_secret);
        
        // Verify TOTP code with larger window for time drift
        const totp = new OTPAuth.TOTP({
          issuer: "JanazApp",
          label: "user",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(settings.totp_secret || ""),
        });

        const currentToken = totp.generate();
        console.log("Current valid token:", currentToken);
        console.log("User entered token:", code);

        const delta = totp.validate({ token: code, window: 2 });
        console.log("Validation delta:", delta);
        isValid = delta !== null;
      }

      console.log("Final validation result:", isValid);

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
      console.log("Updating last verified timestamp...");
      await supabase
        .from("user_2fa_settings")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("user_id", userId);

      toast({
        title: "Verificatie succesvol",
        description: "U wordt ingelogd...",
      });

      console.log("Calling onVerified callback...");
      onVerified();
      setVerifying(false);
      console.log("=== 2FA Verification End ===");
    } catch (error: any) {
      console.error("2FA verification error:", error);
      toast({
        title: "Verificatie fout",
        description: error.message || "Er is een fout opgetreden.",
        variant: "destructive",
      });
      setVerifying(false);
    }
  };

  console.log("TwoFactorVerification render - userId:", userId, "email:", userEmail);

  return (
    <Card className="w-full max-w-md mx-auto relative z-10">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <TbAuth2Fa className="h-12 w-12 text-primary" />
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
            onClick={(e) => {
              e.preventDefault();
              console.log("Verify button clicked!");
              console.log("Verifying state:", verifying);
              console.log("Code length:", code.length);
              handleVerify();
            }} 
            disabled={verifying || (!isRecoveryMode && code.length !== 6) || (isRecoveryMode && code.length !== 8)}
            className="w-full"
            type="button"
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
