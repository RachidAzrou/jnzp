import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Shield, Loader2, Copy, Download } from "lucide-react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export const TwoFactorSetup = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

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
          title: t("toasts.errors.noUser"),
          description: t("toasts.errors.noUserDesc"),
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
        title: t("toasts.errors.qrGenerateError"),
        description: error.message || t("toasts.errors.qrGenerateErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t("toasts.errors.invalidCode"),
        description: t("toasts.errors.invalidCodeDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      console.log("Verifying 2FA code...");
      console.log("Secret (base32):", secret);
      console.log("Entered code:", verificationCode);
      
      // Create TOTP instance with the secret
      const totp = new OTPAuth.TOTP({
        issuer: "JanazApp",
        label: "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Generate current valid token for debugging
      const currentToken = totp.generate();
      console.log("Current valid token:", currentToken);
      
      // Verify the code with a larger window to account for time drift
      const delta = totp.validate({ token: verificationCode, window: 2 });
      console.log("Validation result (delta):", delta);
      
      if (delta === null) {
        toast({
          title: t("toasts.errors.invalidCode"),
          description: t("toasts.errors.invalidCodeTimeDesc"),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
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
            title: t("toasts.errors.2faError"),
            description: error.message,
            variant: "destructive",
          });
        } else {
          // ✅ SECURITY FIX: Clear grace period SERVER-SIDE after successful setup
          console.log('[2FA Setup] Clearing grace period (server-side)');
          const { error: clearError } = await supabase.rpc('clear_2fa_grace_period', {
            p_user_id: user.id
          });
          
          if (clearError) {
            console.error('[2FA Setup] Failed to clear grace period:', clearError);
          }
          
          setEnabled(true);
          setSetupMode(false);
          toast({
            title: t("toasts.success.2faSetupSuccess"),
            description: t("toasts.success.2faSetupSuccessDesc"),
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: t("toasts.errors.verificationFailed"),
        description: error.message || t("toasts.errors.verificationFailedDesc"),
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
          title: t("toasts.errors.2faError"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEnabled(false);
        toast({
          title: t("toasts.success.2faDisabled"),
          description: t("toasts.success.2faDisabledDesc"),
        });
      }
    }
    setSaving(false);
  };

  const downloadRecoveryCodes = () => {
    const text = `${t("2fa.recoveryCodes.title")}\n\n${t("2fa.recoveryCodes.saveSecurely")}\n\n${recoveryCodes.join('\n')}`;
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
      title: t("toasts.success.recoveryCopied"),
      description: t("toasts.success.recoveryCopiedDesc"),
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
          <h3 className="font-semibold text-lg">{t("2fa.setup.step1Title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("2fa.setup.step1Description")}
          </p>
          <ul className="text-sm space-y-1 text-left max-w-xs mx-auto">
            <li>• <strong>{t("2fa.setup.googleAuth")}</strong> (iOS/Android)</li>
            <li>• <strong>{t("2fa.setup.microsoftAuth")}</strong> (iOS/Android)</li>
            <li>• <strong>{t("2fa.setup.authy")}</strong> (iOS/Android/Desktop)</li>
          </ul>
        </div>

        <div className="text-center space-y-4">
          <h3 className="font-semibold text-lg">{t("2fa.setup.step2Title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("2fa.setup.step2Description")}
          </p>
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-center">{t("2fa.setup.step3Title")}</h3>
          <Label htmlFor="verificationCode">{t("2fa.setup.verificationCodeLabel")}</Label>
          <Input
            id="verificationCode"
            placeholder={t("2fa.setup.verificationCodePlaceholder")}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground">
            {t("2fa.setup.verificationCodeHint")}
          </p>
        </div>

        <div className="space-y-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm">{t("2fa.setup.recoveryCodesTitle")}</h4>
          <p className="text-xs text-muted-foreground">
            {t("2fa.setup.recoveryCodesDescription")}
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
              {t("2fa.setup.copy")}
            </Button>
            <Button size="sm" variant="outline" onClick={downloadRecoveryCodes}>
              <Download className="h-4 w-4 mr-2" />
              {t("2fa.setup.download")}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerifyAndEnable} disabled={saving || verificationCode.length !== 6}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("2fa.setup.verifyAndEnable")}
          </Button>
          <Button variant="outline" onClick={() => setSetupMode(false)}>
            {t("2fa.setup.cancel")}
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
            <p className="font-medium">{t("2fa.setup.statusLabel")}</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? t("2fa.setup.enabled") : t("2fa.setup.disabled")}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm ${
          enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}>
          {enabled ? t("2fa.setup.active") : t("2fa.setup.inactive")}
        </div>
      </div>

      {!enabled ? (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            {t("2fa.setup.description")}
          </p>
          <Button onClick={generateSecret} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("2fa.setup.enable")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            {t("2fa.setup.enabledDescription")}
          </p>
          <Button 
            variant="destructive" 
            onClick={handleDisable} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("2fa.setup.disable")}
          </Button>
        </div>
      )}
    </div>
  );
};
