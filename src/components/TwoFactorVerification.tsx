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
  nonce: string;
}

export const TwoFactorVerification = ({ onVerified, onCancel, nonce }: TwoFactorVerificationProps) => {
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
      if (isRecoveryMode) {
        // Recovery code flow - check via get_2fa_settings_with_nonce
        const { data: rawResponse, error: settingsError } = await supabase
          .rpc('get_2fa_settings_with_nonce', {
            p_nonce: nonce
          });
        
        if (settingsError || !rawResponse) {
          toast({
            title: "Fout",
            description: "Kon 2FA instellingen niet ophalen.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const response = rawResponse as {
          valid: boolean;
          totp_enabled?: boolean;
          recovery_codes?: string[];
          user_id?: string;
          error?: string;
        };

        if (!response.valid) {
          toast({
            title: "Sessie verlopen",
            description: response.error || "De verificatie sessie is verlopen. Log opnieuw in.",
            variant: "destructive",
          });
          onCancel();
          return;
        }

        const isValid = response.recovery_codes?.includes(code.toUpperCase()) || false;
        
        if (!isValid) {
          toast({
            title: "Ongeldige recovery code",
            description: "De recovery code is onjuist.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        // Remove used recovery code
        await supabase.rpc('update_2fa_verification', {
          p_user_id: response.user_id,
          p_recovery_code: code.toUpperCase()
        });

        toast({
          title: "Verificatie succesvol",
          description: "U wordt ingelogd...",
        });

        onVerified();
        setVerifying(false);
      } else {
        // TOTP flow - eerst settings ophalen, dan valideren, dan claimen
        console.log("Verifying TOTP code...");
        console.log("Nonce:", nonce);

        const { data: rawResponse, error: settingsError } = await supabase
          .rpc('get_2fa_settings_with_nonce', {
            p_nonce: nonce
          });

        if (settingsError || !rawResponse) {
          toast({
            title: "Fout",
            description: "Kon 2FA instellingen niet ophalen.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const response = rawResponse as {
          valid: boolean;
          totp_enabled?: boolean;
          totp_secret?: string;
          user_id?: string;
          error?: string;
        };

        if (!response.valid) {
          toast({
            title: "Sessie verlopen",
            description: response.error || "De verificatie sessie is verlopen. Log opnieuw in.",
            variant: "destructive",
          });
          onCancel();
          return;
        }

        if (!response.totp_enabled || !response.totp_secret) {
          toast({
            title: "2FA niet ingeschakeld",
            description: "Tweefactorauthenticatie is niet ingeschakeld voor dit account.",
            variant: "destructive",
          });
          onCancel();
          return;
        }

        // Valideer TOTP code met window=1
        const totp = new OTPAuth.TOTP({
          issuer: "JanazApp",
          label: "user",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(response.totp_secret),
        });

        const currentToken = totp.generate();
        console.log("Current valid token:", currentToken);
        console.log("User entered token:", code);

        const delta = totp.validate({ token: code, window: 1 });
        console.log("Validation delta:", delta);

        if (delta === null) {
          toast({
            title: "Ongeldige code",
            description: "De verificatiecode is onjuist. Probeer opnieuw.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        // Code is geldig, nu claimen we de periode om replay te voorkomen
        const now = Math.floor(Date.now() / 1000);
        const step = 30;
        const currentPeriod = Math.floor(now / step);
        const usedPeriod = currentPeriod + delta;

        console.log("Claiming period:", usedPeriod);

        // Probeer de periode te claimen
        const { error: claimError } = await supabase
          .from('user_totp_replay_guard')
          .insert({
            user_id: response.user_id,
            period: usedPeriod
          });

        if (claimError) {
          // Als het een duplicate key error is, is de code al gebruikt
          if (claimError.code === '23505') {
            toast({
              title: "Code al gebruikt",
              description: "Deze verificatiecode is al gebruikt. Wacht op een nieuwe code.",
              variant: "destructive",
            });
          } else {
            console.error("Claim error:", claimError);
            toast({
              title: "Verificatie fout",
              description: "Er is een fout opgetreden bij het verifiëren.",
              variant: "destructive",
            });
          }
          setVerifying(false);
          return;
        }

        // Update last verified timestamp
        await supabase.rpc('update_2fa_verification', {
          p_user_id: response.user_id,
          p_recovery_code: null
        });

        toast({
          title: "Verificatie succesvol",
          description: "U wordt ingelogd...",
        });

        onVerified();
        setVerifying(false);
      }

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

  console.log("TwoFactorVerification render - nonce:", nonce);

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
