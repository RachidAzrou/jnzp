import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TbAuth2Fa } from "react-icons/tb";
import * as OTPAuth from "otpauth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trustDevice } from "@/utils/deviceTrust";

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onCancel: () => void;
  nonce: string;
  userId?: string;
}

export const TwoFactorVerification = ({ onVerified, onCancel, nonce, userId }: TwoFactorVerificationProps) => {
  const [code, setCode] = useState("");
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [trustThisDevice, setTrustThisDevice] = useState(false);
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
        // TOTP flow - server-side verificatie met anti-replay
        console.log("Verifying TOTP code...");
        console.log("Nonce:", nonce);

        // Stap 1: Vraag beschikbare periode en secret op
        const { data: verifyData, error: verifyError } = await supabase
          .rpc('verify_totp_code', {
            p_nonce: nonce,
            p_token: code
          });

        if (verifyError || !verifyData) {
          toast({
            title: "Fout",
            description: "Kon verificatie niet starten.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const verifyResponse = verifyData as {
          success: boolean;
          error?: string;
          user_id?: string;
          secret?: string;
          period?: number;
          step?: number;
          timestamp?: number;
        };

        if (!verifyResponse.success) {
          toast({
            title: "Verificatie mislukt",
            description: verifyResponse.error || "De verificatie is mislukt.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        // Stap 2: Valideer de code client-side met de beschikbare periode
        if (!verifyResponse.secret || verifyResponse.period === undefined) {
          toast({
            title: "Fout",
            description: "Verificatie data ontbreekt.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const totp = new OTPAuth.TOTP({
          issuer: "JanazApp",
          label: "user",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(verifyResponse.secret),
        });

        // Gebruik de exacte server timestamp (al in seconden van Unix epoch)
        // OTPAuth verwacht milliseconden, dus vermenigvuldig met 1000
        const timestamp = (verifyResponse.timestamp || 0) * 1000;
        const expectedToken = totp.generate({ timestamp });

        console.log("Server timestamp:", verifyResponse.timestamp);
        console.log("Expected token for period", verifyResponse.period, ":", expectedToken);
        console.log("User entered:", code);

        if (expectedToken !== code) {
          toast({
            title: "Ongeldige code",
            description: "De verificatiecode is onjuist.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        // Stap 3: Claim de periode (server-side, atomisch)
        const { data: claimData, error: claimError } = await supabase
          .rpc('claim_totp_period', {
            p_nonce: nonce,
            p_period: verifyResponse.period
          });

        if (claimError || !claimData) {
          toast({
            title: "Fout",
            description: "Kon periode niet claimen.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        const claimResponse = claimData as {
          success: boolean;
          error?: string;
          user_id?: string;
        };

        if (!claimResponse.success) {
          toast({
            title: "Code al gebruikt",
            description: claimResponse.error || "Deze code is al gebruikt.",
            variant: "destructive",
          });
          setVerifying(false);
          return;
        }

        // Trust device if requested
        if (trustThisDevice && userId) {
          const trusted = await trustDevice(userId);
          if (trusted) {
            toast({
              title: "Apparaat vertrouwd",
              description: "U hoeft 30 dagen geen 2FA in te voeren op dit apparaat.",
            });
          }
        }

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
    <Card className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border-slate-200 shadow-2xl">
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

        <div className="flex items-center space-x-2 pb-2">
          <Checkbox
            id="trust-device"
            checked={trustThisDevice}
            onCheckedChange={(checked) => setTrustThisDevice(checked as boolean)}
          />
          <Label
            htmlFor="trust-device"
            className="text-sm font-normal cursor-pointer"
          >
            Vertrouw dit apparaat voor 30 dagen
          </Label>
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
