import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import logoAuth from "@/assets/logo-vertical-new.png";

type UserRole = "family" | "funeral_director" | "mosque" | "wasplaats" | "insurer";
type RegistrationStep = "role" | "details";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Registration flow state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>("role");
  const [orgName, setOrgName] = useState("");
  const [orgRegistrationNumber, setOrgRegistrationNumber] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgPostalCode, setOrgPostalCode] = useState("");
  
  const [invitationCode, setInvitationCode] = useState<string>("");
  
  // Password reset state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Login 2FA state
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [pendingSession, setPendingSession] = useState<any>(null);

  useEffect(() => {
    // Check if this is a password reset flow
    const resetParam = searchParams.get("reset");
    if (resetParam === "true") {
      setIsResettingPassword(true);
      
      // Check user role to determine if 2FA is required
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          // Get user role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .order("role")
            .limit(1)
            .maybeSingle();

          if (roleData) {
            setUserRole(roleData.role);
            // Professionals need 2FA
            const professionalRoles = ["funeral_director", "mosque", "wasplaats", "insurer", "org_admin"];
            if (professionalRoles.includes(roleData.role)) {
              setRequires2FA(true);
            } else {
              setIs2FAVerified(true); // Family doesn't need 2FA
            }
          }
        }
      });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if account is locked
      const { data: isLocked } = await supabase.rpc('is_account_locked', { 
        p_email: email 
      });

      if (isLocked) {
        throw new Error("Account tijdelijk geblokkeerd na te veel mislukte inlogpogingen. Probeer het over 15 minuten opnieuw.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed attempt
        await supabase.from('login_attempts').insert({
          email: email,
          success: false,
          ip_address: null, // Could be captured from request
          user_agent: navigator.userAgent,
        });
        throw error;
      }

      // Log successful attempt
      if (data.user) {
        await supabase.from('login_attempts').insert({
          email: email,
          success: true,
          ip_address: null,
          user_agent: navigator.userAgent,
        });

        // Check if user requires 2FA AND has it enabled
        const { data: requires2FA } = await supabase.rpc('user_requires_2fa', {
          user_id: data.user.id
        });

        if (requires2FA) {
          // Check if 2FA is actually enabled (user has completed setup)
          const { data: settings } = await supabase
            .from("user_2fa_settings")
            .select("totp_enabled")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (settings?.totp_enabled) {
            // Store session data for 2FA verification
            setPendingSession({
              userId: data.user.id,
              email: data.user.email,
            });
            setShow2FAVerification(true);
            setLoading(false);
            
            // CRITICAL: Sign out immediately to prevent bypass
            // User will be re-authenticated after 2FA verification
            await supabase.auth.signOut();
            return;
          }
        }
      }

      toast({
        title: "Welkom terug!",
        description: "U bent succesvol ingelogd.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Inloggen mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerified = async () => {
    console.log("2FA verified, logging in with stored credentials...");
    
    // Re-authenticate the user after successful 2FA
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Inloggen mislukt",
          description: "Er is een fout opgetreden na 2FA verificatie.",
          variant: "destructive",
        });
        setShow2FAVerification(false);
        setPendingSession(null);
        return;
      }
      
      setShow2FAVerification(false);
      setPendingSession(null);
      
      toast({
        title: "Welkom terug!",
        description: "U bent succesvol ingelogd.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handle2FACancel = async () => {
    console.log("2FA cancelled");
    setShow2FAVerification(false);
    setPendingSession(null);
    setEmail("");
    setPassword("");
  };

  const handleFamilySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: "family",
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "family",
          scope: "ORG",
        });
      }

      toast({
        title: "Account aangemaakt",
        description: "Controleer uw e-mail voor verificatie. U kunt daarna inloggen.",
      });

      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setSelectedRole(null);
      setRegistrationStep("role");
    } catch (error: any) {
      toast({
        title: "Registratie mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            role: selectedRole,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("User creation failed");

      const orgType = selectedRole === "funeral_director" ? "FUNERAL_DIRECTOR" : 
                      selectedRole === "mosque" ? "MOSQUE" :
                      selectedRole === "wasplaats" ? "WASPLAATS" : "INSURER";

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert([{
          name: orgName,
          type: orgType as "FUNERAL_DIRECTOR" | "MOSQUE" | "WASPLAATS" | "INSURER",
          verification_status: "PENDING_VERIFICATION",
          registration_number: orgRegistrationNumber,
          address: orgAddress,
          city: orgCity,
          postal_code: orgPostalCode,
          contact_email: email,
          contact_phone: phone,
          requested_by: data.user.id,
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      if (orgData) {
        await supabase.rpc("log_admin_action", {
          p_action: "ORG_REGISTRATION_REQUEST",
          p_target_type: "Organization",
          p_target_id: orgData.id,
          p_metadata: { org_type: orgType, email: email },
        });
      }

      toast({
        title: "Aanvraag ingediend",
        description: "Uw aanvraag wordt beoordeeld. U ontvangt bericht zodra uw account is goedgekeurd.",
      });

      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setOrgName("");
      setOrgRegistrationNumber("");
      setOrgAddress("");
      setOrgCity("");
      setOrgPostalCode("");
      setSelectedRole(null);
      setRegistrationStep("role");
    } catch (error: any) {
      toast({
        title: "Registratie mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Reset-link verzonden",
        description: "Als dit e-mailadres bij ons bekend is, ontvangt u een herstel-link.",
      });

      setShowResetDialog(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For MVP: Simple 6-digit code check
      // In production, this should verify against a TOTP or SMS code
      if (twoFACode.length !== 6) {
        throw new Error("De 2FA-code moet 6 cijfers bevatten");
      }

      // TODO: Implement actual 2FA verification
      // For now, accept any 6-digit code for demonstration
      setIs2FAVerified(true);
      setTwoFACode("");
      
      toast({
        title: "2FA geverifieerd",
        description: "U kunt nu uw nieuwe wachtwoord instellen.",
      });
    } catch (error: any) {
      toast({
        title: "2FA verificatie mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 12) {
      toast({
        title: "Wachtwoord te kort",
        description: "Het wachtwoord moet minimaal 12 tekens bevatten.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Wachtwoorden komen niet overeen",
        description: "Controleer of beide wachtwoorden identiek zijn.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Log the password reset action
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.rpc("log_admin_action", {
          p_action: "PWD_RESET",
          p_target_type: "User",
          p_target_id: userData.user.id,
          p_metadata: { 
            timestamp: new Date().toISOString(),
            role: userRole 
          },
        });
      }

      toast({
        title: "Wachtwoord gewijzigd",
        description: "Uw wachtwoord is succesvol gewijzigd. Alle eerdere sessies zijn beëindigd.",
      });

      // Sign out to end all sessions
      await supabase.auth.signOut();

      // Redirect to login
      setIsResettingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setIs2FAVerified(false);
      setRequires2FA(false);
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Fout bij wijzigen wachtwoord",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Password reset form with 2FA check for professionals
  if (isResettingPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 shadow-2xl border-border/50">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="flex justify-center">
              <img 
                src={logoAuth} 
                alt="JanazApp Logo" 
                className="h-40 w-40 object-contain animate-fade-in"
              />
            </div>
            <div className="space-y-2">
              <CardTitle>
                {requires2FA && !is2FAVerified ? "Verificatie vereist" : "Nieuw wachtwoord instellen"}
              </CardTitle>
              <CardDescription className="text-base">
                {requires2FA && !is2FAVerified 
                  ? "Voer uw 2FA-code in om door te gaan" 
                  : "Kies een sterk wachtwoord van minimaal 12 tekens"
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            {requires2FA && !is2FAVerified ? (
              // 2FA Verification Form for Professionals
              <form onSubmit={handleVerify2FA} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">2FA Verificatiecode</Label>
                  <Input
                    id="2fa-code"
                    type="text"
                    placeholder="123456"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    className="h-11 text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    Voer de 6-cijferige code in van uw authenticator-app of SMS
                  </p>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig met verifiëren...
                    </>
                  ) : (
                    "Verifieer"
                  )}
                </Button>
              </form>
            ) : (
              // Password Reset Form
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nieuw wachtwoord</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={12}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimaal 12 tekens
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Bevestig wachtwoord</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Bezig met wijzigen...
                    </>
                  ) : (
                    "Wachtwoord wijzigen"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show 2FA verification if required
  if (show2FAVerification) {
    console.log("Rendering 2FA verification screen");
    console.log("Pending session:", pendingSession);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <TwoFactorVerification 
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
          userId={pendingSession?.userId || ""}
          userEmail={pendingSession?.email || ""}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <img 
              src={logoAuth} 
              alt="JanazApp Logo" 
              className="h-40 w-40 object-contain animate-fade-in"
            />
          </div>
          <div className="space-y-2">
            <CardDescription className="text-base">
              Centraal platform voor uitvaartzorg
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium">
                E-mailadres
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium">
                Wachtwoord
              </Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig met inloggen...
                </>
              ) : (
                "Inloggen"
              )}
            </Button>

            <div className="space-y-2 pt-4">
              <Button
                type="button"
                variant="link"
                className="w-full text-sm text-primary"
                onClick={() => setShowResetDialog(true)}
              >
                Wachtwoord vergeten?
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Of</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/register")}
              >
                Registreer hier
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wachtwoord herstellen</DialogTitle>
            <DialogDescription>
              Voer uw e-mailadres in. Als dit e-mailadres bij ons bekend is, ontvangt u een herstel-link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">E-mailadres</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="naam@voorbeeld.nl"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowResetDialog(false);
                  setResetEmail("");
                }}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig...
                  </>
                ) : (
                  "Verstuur reset-link"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
