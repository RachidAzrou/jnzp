import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Copy, Download } from "lucide-react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export const TwoFactorSetup = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from("user_2fa_settings")
        .select("totp_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setEnabled(data.totp_enabled);
      }
    }
    setLoading(false);
  };

  const generateSecret = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Fout",
          description: "Geen gebruiker gevonden. Probeer opnieuw in te loggen.",
          variant: "destructive",
        });
        return;
      }

      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer: "JanazApp",
        label: user.email || "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
      });

      const newSecret = totp.secret.base32;
      setSecret(newSecret);

      // Generate recovery codes (10 codes)
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setRecoveryCodes(codes);

      // Generate QR code from the URI
      const qrCodeDataUrl = await QRCode.toDataURL(totp.toString());
      setQrCode(qrCodeDataUrl);
      setSetupMode(true);
    } catch (error: any) {
      toast({
        title: "Fout bij genereren QR code",
        description: error.message || "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Ongeldige code",
        description: "Voer een 6-cijferige code in.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create TOTP instance with the secret
      const totp = new OTPAuth.TOTP({
        issuer: "JanazApp",
        label: "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Verify the code
      const delta = totp.validate({ token: verificationCode, window: 1 });
      
      if (delta === null) {
        toast({
          title: "Ongeldige code",
          description: "De verificatiecode is onjuist. Probeer opnieuw.",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from("user_2fa_settings")
          .upsert({
            user_id: user.id,
            totp_enabled: true,
            totp_secret: secret,
            recovery_codes: recoveryCodes,
            last_verified_at: new Date().toISOString(),
          });

        if (error) {
          toast({
            title: "Fout",
            description: error.message,
            variant: "destructive",
          });
        } else {
          setEnabled(true);
          setSetupMode(false);
          toast({
            title: "2FA ingeschakeld",
            description: "Tweefactorauthenticatie is nu actief voor uw account.",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Verificatie mislukt",
        description: error.message || "Er is een fout opgetreden bij het verifiëren.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("user_2fa_settings")
        .update({ 
          totp_enabled: false,
          totp_secret: null,
          recovery_codes: null,
        })
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Fout",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEnabled(false);
        toast({
          title: "2FA uitgeschakeld",
          description: "Tweefactorauthenticatie is uitgeschakeld.",
        });
      }
    }
    setSaving(false);
  };

  const downloadRecoveryCodes = () => {
    const text = `JanazApp Recovery Codes\n\nBewaar deze codes op een veilige plek.\n\n${recoveryCodes.join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'janazapp-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast({
      title: "Gekopieerd",
      description: "Recovery codes zijn gekopieerd naar klembord.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (setupMode) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h3 className="font-semibold text-lg">Stap 1: Download een authenticator app</h3>
          <p className="text-sm text-muted-foreground">
            Download één van deze apps op uw telefoon:
          </p>
          <ul className="text-sm space-y-1 text-left max-w-xs mx-auto">
            <li>• <strong>Google Authenticator</strong> (iOS/Android)</li>
            <li>• <strong>Microsoft Authenticator</strong> (iOS/Android)</li>
            <li>• <strong>Authy</strong> (iOS/Android/Desktop)</li>
          </ul>
        </div>

        <div className="text-center space-y-4">
          <h3 className="font-semibold text-lg">Stap 2: Scan de QR code</h3>
          <p className="text-sm text-muted-foreground">
            Open de app en scan deze QR code
          </p>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-center">Stap 3: Voer de code in</h3>
          <Label htmlFor="verificationCode">Verificatiecode uit de app</Label>
          <Input
            id="verificationCode"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Voer de 6-cijferige code in uit uw authenticator app
          </p>
        </div>

        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm">Recovery Codes</h4>
          <p className="text-xs text-muted-foreground">
            Bewaar deze codes op een veilige plek. U kunt ze gebruiken als u geen toegang heeft tot uw authenticator app.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="bg-background p-2 rounded">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyRecoveryCodes}>
              <Copy className="h-4 w-4 mr-2" />
              Kopiëren
            </Button>
            <Button size="sm" variant="outline" onClick={downloadRecoveryCodes}>
              <Download className="h-4 w-4 mr-2" />
              Downloaden
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerifyAndEnable} disabled={saving || verificationCode.length !== 6}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verifiëren en inschakelen
          </Button>
          <Button variant="outline" onClick={() => setSetupMode(false)}>
            Annuleren
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "2FA is ingeschakeld" : "2FA is uitgeschakeld"}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}>
          {enabled ? "Actief" : "Inactief"}
        </div>
      </div>

      {!enabled ? (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Tweefactorauthenticatie voegt een extra beveiligingslaag toe aan uw account.
            Bij het inloggen heeft u naast uw wachtwoord ook een verificatiecode nodig.
          </p>
          <Button onClick={generateSecret} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            2FA inschakelen
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Uw account is beveiligd met tweefactorauthenticatie.
          </p>
          <Button 
            variant="destructive" 
            onClick={handleDisable} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            2FA uitschakelen
          </Button>
        </div>
      )}
    </div>
  );
};
