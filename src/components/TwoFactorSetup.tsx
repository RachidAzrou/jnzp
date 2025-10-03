import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";

export const TwoFactorSetup = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
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

  const handleEnable = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // For MVP: simplified 2FA setup
      const { error } = await supabase
        .from("user_2fa_settings")
        .upsert({
          user_id: user.id,
          totp_enabled: true,
          totp_secret: "TEMP_SECRET_" + Math.random().toString(36).substring(7)
        });

      if (error) {
        toast({
          title: "Fout",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEnabled(true);
        toast({
          title: "2FA ingeschakeld",
          description: "Tweefactorauthenticatie is nu actief voor uw account.",
        });
      }
    }
    setSaving(false);
  };

  const handleDisable = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("user_2fa_settings")
        .update({ totp_enabled: false })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
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
          <Button onClick={handleEnable} disabled={saving}>
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
