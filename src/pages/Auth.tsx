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
import { SimpleCaptcha } from "@/components/SimpleCaptcha";
import { validatePassword, getPasswordRequirements } from "@/utils/passwordValidation";
import { checkRateLimit, getLoginDelay, formatRetryAfter } from "@/utils/rateLimit";
import { checkDeviceTrust } from "@/utils/deviceTrust";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logoAuth from "@/assets/logo-vertical-new.png";
import logoJanazApp from "@/assets/logo-janazapp.png";
import authBackground from "@/assets/auth-background.jpg";

type UserRole = "family" | "funeral_director" | "mosque" | "wasplaats" | "insurer";
type RegistrationStep = "role" | "details";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
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
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);
  
  // Rate limiting & Captcha state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loginDelay, setLoginDelay] = useState(0);

  useEffect(() => {
    const init = async () => {
      // Check if this is an invitation acceptance flow
      const inviteCode = searchParams.get("invite");
      
      // Check if this is a password reset flow
      const resetParam = searchParams.get("reset");
      if (resetParam === "true") {
        setIsResettingPassword(true);
        
        // Check user role to determine if 2FA is required
        const { data: { session } } = await supabase.auth.getSession();
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
            const professionalRoles = ["funeral_director", "mosque", "wasplaats", "insurer", "org_admin", "admin", "platform_admin"];
            if (professionalRoles.includes(roleData.role)) {
              setRequires2FA(true);
            } else {
              setIs2FAVerified(true); // Family doesn't need 2FA
            }
          }
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // If logged in with invite code, accept invitation
        if (inviteCode) {
          const { data, error } = await supabase.rpc('accept_invitation', {
            p_code: inviteCode,
            p_user_id: session.user.id,
          });
          
          if (!error && data) {
            const result = data as any;
            if (result.success) {
              toast({
                title: 'Uitnodiging geaccepteerd',
                description: 'U bent toegevoegd aan de organisatie',
              });
            }
          }
        }
        navigate("/");
      }
    };
    
    init();
  }, [navigate, searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check rate limit (5 attempts per 15 minutes)
      const rateLimitResult = await checkRateLimit(email, 'login', 5, 15);
      
      if (!rateLimitResult.allowed) {
        toast({
          title: "Te veel pogingen",
          description: `Probeer het opnieuw over ${formatRetryAfter(rateLimitResult.retry_after || 0)}.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if account is locked
      const { data: isLocked } = await supabase.rpc('is_account_locked', { 
        p_email: email 
      });

      if (isLocked) {
        throw new Error("Account tijdelijk geblokkeerd na te veel mislukte inlogpogingen. Probeer het over 15 minuten opnieuw.");
      }

      // Get progressive delay based on failed attempts
      const delay = await getLoginDelay(email);
      
      if (delay > 0) {
        toast({
          title: "Wacht alstublieft",
          description: `Wacht ${delay} seconden voor de volgende poging.`,
          variant: "destructive",
        });
        
        // Show captcha after 3 failed attempts (delay >= 5)
        if (delay >= 5) {
          setShowCaptcha(true);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }

      // Require captcha after 3 failed attempts
      if (showCaptcha && !captchaToken) {
        toast({
          title: "Captcha verificatie vereist",
          description: "Los de captcha op om door te gaan.",
          variant: "destructive",
        });
        setLoading(false);
        return;
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
          ip_address: null,
          user_agent: navigator.userAgent,
        });
        
        // Increment login attempts
        setLoginAttempts(prev => prev + 1);
        
        // Show captcha after 3 attempts
        if (loginAttempts >= 2) {
          setShowCaptcha(true);
        }
        
        throw error;
      }

      // Reset captcha state on successful login
      setShowCaptcha(false);
      setCaptchaToken(null);
      setLoginAttempts(0);

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
            // Check if device is trusted
            const isDeviceTrusted = await checkDeviceTrust(data.user.id);
            
            if (!isDeviceTrusted) {
              // Maak een veilige, kortstondige nonce
              const { data: nonceData, error: nonceError } = await supabase.rpc('create_2fa_nonce', {
                p_user_id: data.user.id,
                p_ip: null,
                p_user_agent: navigator.userAgent
              });

              if (nonceError || !nonceData) {
                throw new Error("Kon geen 2FA verificatie starten");
              }

              // Store nonce and user ID for device trust
              setPendingSession({ nonce: nonceData });
              setPending2FAUserId(data.user.id);
              setShow2FAVerification(true);
              setLoading(false);
              
              // CRITICAL: Sign out immediately to prevent bypass
              await supabase.auth.signOut();
              return;
            } else {
              // Device is trusted, skip 2FA
              toast({
                title: "Welkom terug!",
                description: "Ingelogd op vertrouwd apparaat.",
              });
            }
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
        title: t("auth.loginFailed"),
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
          title: t("auth.loginFailed"),
          description: t("auth.twoFAFailed"),
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
      // Validate password
      const validation = await validatePassword(password);
      if (!validation.valid) {
        toast({
          title: t("auth.invalidPassword"),
          description: validation.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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
        title: t("auth.accountCreated"),
        description: t("auth.checkEmail"),
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
      // Validate password
      const validation = await validatePassword(password);
      if (!validation.valid) {
        toast({
          title: t("auth.invalidPassword"),
          description: validation.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

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
      // Check rate limit (3 requests per hour)
      const rateLimitResult = await checkRateLimit(resetEmail, 'password_reset', 3, 60);
      
      if (!rateLimitResult.allowed) {
        toast({
          title: "Te veel reset verzoeken",
          description: `Probeer het opnieuw over ${formatRetryAfter(rateLimitResult.retry_after || 0)}.`,
          variant: "destructive",
        });
        setResetLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: t("auth.resetLinkSent"),
        description: t("auth.resetLinkDescription"),
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
        title: t("auth.twoFAVerified"),
        description: t("auth.twoFAVerifiedDescription"),
      });
    } catch (error: any) {
      toast({
        title: t("auth.twoFAFailed"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: t("auth.passwordsDoNotMatch"),
        description: t("auth.checkPasswordsMatch"),
        variant: "destructive",
      });
      return;
    }

    // Validate password strength
    const validation = await validatePassword(newPassword);
    if (!validation.valid) {
      toast({
        title: t("auth.invalidPassword"),
        description: validation.error,
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
        title: t("auth.passwordChanged"),
        description: t("auth.passwordChangedDescription"),
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
        title: t("auth.passwordChangeFailed"),
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
                {requires2FA && !is2FAVerified ? t("auth.verificationRequired") : t("auth.setNewPassword")}
              </CardTitle>
              <CardDescription className="text-base">
                {requires2FA && !is2FAVerified 
                  ? t("auth.enterTwoFACode")
                  : t("auth.chooseStrongPassword")
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            {requires2FA && !is2FAVerified ? (
              // 2FA Verification Form for Professionals
              <form onSubmit={handleVerify2FA} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">{t("auth.twoFAVerificationCode")}</Label>
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
                    {t("auth.enterSixDigitCode")}
                  </p>
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.verifying")}
                    </>
                  ) : (
                    t("auth.verify")
                  )}
                </Button>
              </form>
            ) : (
              // Password Reset Form
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
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
                  <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
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
                      {t("auth.changing")}
                    </>
                  ) : (
                    t("auth.changePassword")
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
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        {/* Background image */}
        <div className="absolute inset-0">
          <img 
            src={authBackground} 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10">
          <TwoFactorVerification 
            onVerified={handle2FAVerified}
            onCancel={handle2FACancel}
            nonce={pendingSession?.nonce || ""}
            userId={pending2FAUserId || undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-6 relative">
      {/* Background image */}
      <div className="absolute inset-0">
        <img 
          src={authBackground} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="w-full max-w-[95vw] sm:max-w-6xl lg:max-w-7xl relative my-4 sm:my-8">
        <Card className="overflow-hidden bg-white/80 backdrop-blur-xl border-slate-200 shadow-2xl min-h-[600px] lg:min-h-[700px]">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Decorative */}
            <div className="hidden md:flex items-center justify-center p-8 lg:p-16 bg-white relative overflow-hidden min-h-[600px] lg:min-h-[700px]">
              <div className="absolute inset-0">
                {/* Logo in de linkerkant */}
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={logoJanazApp} 
                    alt="JanazApp Logo" 
                    className="w-48 lg:w-72 h-auto object-contain animate-fade-in"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Login form */}
            <div className="p-6 sm:p-8 md:p-10 lg:p-14 bg-white flex items-center">
              <div className="w-full">
              <div className="space-y-8">
                {/* Language Switcher */}
                <div className="flex justify-end">
                  <LanguageSwitcher />
                </div>

                {/* Header */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {t("auth.welcome")}
                  </h1>
                  <p className="text-muted-foreground">
                    Centraal platform voor uitvaartzorg
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        {t("auth.email")}
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="naam@voorbeeld.nl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-12 bg-background border-input focus:border-primary focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        {t("auth.password")}
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-12 bg-background border-input focus:border-primary focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-medium shadow-lg shadow-primary/20 transition-all" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("auth.loggingIn")}
                      </>
                    ) : (
                      t("auth.signIn")
                    )}
                  </Button>

                  {showCaptcha && (
                    <SimpleCaptcha
                      onVerify={(token) => {
                        setCaptchaToken(token);
                        toast({
                          title: "Verificatie succesvol",
                          description: "U kunt nu opnieuw proberen in te loggen.",
                        });
                      }}
                      className="mt-4"
                    />
                  )}

                  <div className="space-y-4 pt-2">
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm text-primary hover:text-primary/80 p-0"
                      onClick={() => setShowResetDialog(true)}
                    >
                      {t("auth.forgotPassword")}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      {t("auth.noAccount")}{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                        onClick={() => navigate("/register")}
                      >
                        {t("auth.register")}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("auth.forgotPassword")}</DialogTitle>
            <DialogDescription>
              {t("auth.resetPasswordDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t("auth.email")}</Label>
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.loading")}
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
