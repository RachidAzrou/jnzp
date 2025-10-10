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

type UserRole = "funeral_director" | "mosque" | "mortuarium" | "insurer";
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

  // Clear any existing sessions on mount to prevent loops
  useEffect(() => {
    const clearStuckSessions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
      }
    };
    clearStuckSessions();
  }, []);
  
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
            const professionalRoles = ["funeral_director", "mosque", "mortuarium", "insurer", "org_admin", "admin", "platform_admin"];
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
                title: t('register.invitationAccepted'),
                description: t('register.invitationAcceptedDescription'),
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
          title: t("auth.error.tooManyAttempts"),
          description: `${t("auth.error.tryAgainAfter")} ${formatRetryAfter(rateLimitResult.retry_after || 0)}.`,
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
        throw new Error(t("auth.error.accountLockedDescription"));
      }

      // Get progressive delay based on failed attempts
      const delay = await getLoginDelay(email);
      
      if (delay > 0) {
        toast({
          title: t("auth.error.pleaseWait"),
          description: `${t("auth.error.pleaseWait")} ${delay} ${t("auth.error.waitSeconds")}.`,
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
          title: t("auth.error.captchaRequired"),
          description: t("auth.error.completeCaptcha"),
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

        // CRITICAL: Check if user has professional role
        const { data: allRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role, organization_id, scope")
          .eq("user_id", data.user.id);

        if (rolesError) {
          console.error('[Auth] Error fetching user roles:', rolesError);
        }

        // Check if user has professional scope (ORG) - these users MUST have organization_id
        const hasProfessionalScope = allRoles?.some(r => r.scope === 'ORG');
        
        // Check if user is platform_admin (no organization required)
        const isPlatformAdmin = allRoles?.some(r => r.role === 'platform_admin');

        if (hasProfessionalScope && !isPlatformAdmin) {
          // Professional users (scope='ORG', NOT platform_admin) MUST have an organization_id
          const roleWithOrg = allRoles?.find(r => r.organization_id !== null);
          
          if (!roleWithOrg) {
            // Professional user (scope='ORG') has NO organization - incomplete registration
            await supabase.auth.signOut();
            toast({
              title: "Registratie Incompleet",
              description: "Uw registratie is niet compleet. Neem contact op met support.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }

          // Check organization status
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("verification_status, name")
            .eq("id", roleWithOrg.organization_id)
            .maybeSingle();

          if (orgError) {
            console.error('[Auth] Error fetching org:', orgError);
          }

          // Block login if organization exists but is not ACTIVE
          if (orgData && orgData.verification_status !== "ACTIVE") {
            // Immediately sign out
            await supabase.auth.signOut();
            
            if (orgData.verification_status === "PENDING_VERIFICATION") {
              toast({
                title: t("auth.error.accountNotActive"),
                description: t("auth.error.accountPendingApproval"),
                variant: "destructive",
              });
            } else if (orgData.verification_status === "REJECTED") {
              toast({
                title: t("auth.error.requestRejected"),
                description: t("auth.error.requestRejectedDescription"),
                variant: "destructive",
              });
            } else {
              toast({
                title: t("auth.error.accountNotActive"),
                description: t("auth.error.contactSupport"),
                variant: "destructive",
              });
            }
            
            setLoading(false);
            return;
          }
        }

        // Check if user requires 2FA
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
                throw new Error(t("auth.error.couldNotStart2FA"));
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
                title: t("auth.welcomeBack"),
                description: t("auth.loggedInTrustedDevice"),
              });
            }
          } else {
            // Professional user requires 2FA but hasn't set it up yet
            // Check if this is a platform admin - they can setup 2FA themselves
            if (isPlatformAdmin) {
              // Platform admin: allow login and redirect to 2FA setup
              toast({
                title: "2FA Setup Vereist",
                description: "U moet twee-factor authenticatie instellen voor uw account.",
                variant: "default",
              });
              navigate("/instellingen?setup2fa=true");
              return;
            } else {
              // Other professional users: block and require admin assistance
              await supabase.auth.signOut();
              toast({
                title: t("auth.error.twoFARequired"),
                description: "U moet eerst twee-factor authenticatie instellen. Neem contact op met de beheerder.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
          }
        }
      }

      toast({
        title: t("auth.welcomeBack"),
        description: t("auth.loggedInSuccessfully"),
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
        title: t("auth.welcomeBack"),
        description: t("auth.loggedInSuccessfully"),
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: t("common.error"),
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


  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check rate limits
      const rateLimitCheck = await checkRateLimit(email, "signup");
      if (!rateLimitCheck.allowed) {
        toast({
          variant: "destructive",
          title: t("auth.error.tooManyAttempts"),
          description: formatRetryAfter(rateLimitCheck.retry_after || 60),
        });
        setLoading(false);
        return;
      }

      // Validate password
      const passwordValidation = await validatePassword(password);
      if (!passwordValidation.valid) {
        toast({
          variant: "destructive",
          title: t("auth.error.weakPassword"),
          description: passwordValidation.error || t("auth.error.weakPassword"),
        });
        setLoading(false);
        return;
      }

      // Signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: `${firstName} ${lastName}`,
            phone,
            role: selectedRole,
          },
        },
      });

      if (error) throw error;

      // Create organization with proper type mapping
      if (data.user) {
        const orgType = selectedRole === "funeral_director" ? "FUNERAL_DIRECTOR" : 
                       selectedRole === "mosque" ? "MOSQUE" :
                       selectedRole === "mortuarium" ? "MORTUARIUM" : "INSURER";
        
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: orgName,
            type: orgType,
            registration_number: orgRegistrationNumber,
            address: orgAddress,
            city: orgCity,
            postal_code: orgPostalCode,
            contact_email: email,
            contact_phone: phone,
            requested_by: data.user.id,
            verification_status: "PENDING_VERIFICATION",
          })
          .select('id')
          .single();

        if (orgError) throw orgError;

        // Create user_roles: org_admin + operational role
        const rolesToInsert: Array<{
          user_id: string;
          organization_id: string;
          role: 'org_admin' | 'funeral_director' | 'mosque' | 'mortuarium' | 'insurer';
        }> = [
          { user_id: data.user.id, organization_id: orgData.id, role: 'org_admin' as const }
        ];

        // Add operational role based on selected role
        const operationalRole = selectedRole as 'funeral_director' | 'mosque' | 'mortuarium' | 'insurer';
        rolesToInsert.push({
          user_id: data.user.id,
          organization_id: orgData.id,
          role: operationalRole
        });

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);

        if (rolesError) {
          console.error('Roles creation error:', rolesError);
          throw new Error('Failed to assign roles');
        }
      }

      // CRITICAL: Force sign out immediately after signup
      await supabase.auth.signOut();

      toast({
        title: t("auth.success.signupComplete"),
        description: t("auth.success.checkEmail"),
      });

      // Navigate to check-email page
      navigate("/check-email");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("auth.error.signupFailed"),
        description: error.message,
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
          title: t("auth.error.tooManyAttempts"),
          description: `${t("auth.error.tryAgainAfter")} ${formatRetryAfter(rateLimitResult.retry_after || 0)}.`,
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
        title: t("common.error"),
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
        throw new Error(t("auth.error.twoFACodeSixDigits"));
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
                    {t("auth.minCharacters")}
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
              <div className="w-full space-y-8">
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
                  {t("auth.platformDescription")}
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
                      title: t("auth.verificationSuccessful"),
                      description: t("auth.canLoginAgain"),
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
                  t("auth.sendResetLink")
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
