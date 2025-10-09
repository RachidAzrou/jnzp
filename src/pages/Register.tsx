import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { PiMosque } from "react-icons/pi";
import { LuHandshake } from "react-icons/lu";
import { RiHandHeartLine } from "react-icons/ri";
import { IoBusiness } from "react-icons/io5";
import logoAuth from "@/assets/logo-icon-new.png";
import logoJanazApp from "@/assets/logo-janazapp.png";
import authBackground from "@/assets/auth-background.jpg";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type UserRole = "funeral_director" | "mosque" | "wasplaats" | "insurer";
type RegistrationStep = "role" | "details";
type DetailsSubStep = "organization" | "contact";

const Register = () => {
  const { t } = useTranslation();
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
  const [detailsSubStep, setDetailsSubStep] = useState<DetailsSubStep>("organization");
  // Organization fields
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("BE");
  const [language, setLanguage] = useState("nl");
  const [invitationCode, setInvitationCode] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Check if user has invitation code to accept
        const code = searchParams.get("invite");
        if (code) {
          // User is logged in with invitation - accept it
          const { data, error } = await supabase.rpc('accept_invitation', {
            p_code: code,
            p_user_id: session.user.id,
          });
          
          if (!error && data) {
            const result = data as any;
            if (result.success) {
              toast({
                title: t('register.invitationAccepted'),
                description: t('register.invitationAcceptedDescription'),
              });
              navigate('/');
            }
          }
        } else {
          navigate("/");
        }
      }
    });
    
    const code = searchParams.get("invite");
    if (code) {
      setInvitationCode(code);
    }
  }, [navigate, searchParams, toast]);

  // Map frontend role to backend org type
  const mapRoleToOrgType = (role: UserRole): "FD" | "MOSQUE" | "MORTUARIUM" | "INSURER" => {
    switch (role) {
      case "funeral_director": return "FD";
      case "mosque": return "MOSQUE";
      case "wasplaats": return "MORTUARIUM";
      case "insurer": return "INSURER";
      default: return "FD";
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1) Create auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role: selectedRole,
          },
        },
      });
      
      if (error) throw error;
      if (!data.user) throw new Error("User creation failed");

      const orgType = mapRoleToOrgType(selectedRole!);
      const fullName = `${firstName} ${lastName}`.trim();

      // 2) Create organization + contact person via RPC
      const { data: reg, error: regErr } = await supabase.rpc('fn_register_org_with_contact', {
        p_org_type: orgType,
        p_org_name: companyName,
        p_contact_full_name: fullName,
        p_contact_email: email,
        p_kvk: businessNumber || null,
        p_vat: null,
        p_contact_phone: phone || null,
        p_set_active: false
      });
      
      if (regErr) throw regErr;
      const { org_id } = reg as any;

      // 3) Update organization with address and contact details
      await supabase.from("organizations")
        .update({
          company_name: companyName,
          address_street: addressStreet,
          address_city: addressCity,
          address_postcode: addressPostcode,
          address_country: addressCountry,
          contact_email: email,
          contact_phone: phone,
          contact_first_name: firstName,
          contact_last_name: lastName,
          language,
        })
        .eq("id", org_id);

      // 4) Log registration action
      await supabase.rpc("log_admin_action", {
        p_action: "ORG_REGISTRATION_REQUEST",
        p_target_type: "Organization",
        p_target_id: org_id,
        p_metadata: { org_type: orgType, email },
      });

      toast({
        title: t("register.requestSubmitted"),
        description: t("register.requestSubmittedDescription"),
      });
      
      navigate("/auth");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: t("register.registrationFailed"),
        description: error.message || t("register.errorDescription"),
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "funeral_director": return <LuHandshake className="h-5 w-5" />;
      case "mosque": return <PiMosque className="h-5 w-5" />;
      case "wasplaats": return <RiHandHeartLine className="h-5 w-5" />;
      case "insurer": return <IoBusiness className="h-5 w-5" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "funeral_director": return t('roles.funeral_director');
      case "mosque": return t('roles.mosque');
      case "wasplaats": return t('roles.wasplaats');
      case "insurer": return t('roles.insurer');
    }
  };

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
            {/* Left side - Logo */}
            <div className="hidden md:flex items-center justify-center p-8 lg:p-16 bg-white relative overflow-hidden min-h-[600px] lg:min-h-[700px]">
              <div className="absolute inset-0">
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={logoJanazApp} 
                    alt="JanazApp Logo" 
                    className="w-64 lg:w-96 h-auto object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Right side - Registration form */}
            <div className="p-6 sm:p-8 md:p-10 lg:p-14 bg-white flex items-center">
              <div className="w-full">
              <div className="space-y-6">
                {/* Language Switcher */}
                <div className="flex justify-end">
                  <LanguageSwitcher />
                </div>

                {/* Header */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {t('register.title')}
                  </h1>
                  <p className="text-muted-foreground">
                    {t('register.subtitle')}
                  </p>
                </div>

                {/* Content Area */}
                {registrationStep === "role" ? (
                  <div className="space-y-4">
                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          1
                        </div>
                        <span className="text-xs font-medium">{t('register.stepRole')}</span>
                      </div>
                      <div className="w-8 h-0.5 bg-muted"></div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                          2
                        </div>
                        <span className="text-xs text-muted-foreground">{t('register.stepDetails')}</span>
                      </div>
                    </div>

                    <div className="text-center space-y-1 mb-4">
                      <h3 className="font-semibold text-lg">{t('register.chooseRole')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('register.chooseRoleSubtitle')}
                      </p>
                    </div>

                    <div className="grid gap-1.5">
                      {(["funeral_director", "mosque", "wasplaats", "insurer"] as UserRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className={`relative flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all duration-200 text-left group hover:border-primary hover:shadow-md ${
                            selectedRole === role 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border hover:bg-accent/50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors ${
                            selectedRole === role 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                          }`}>
                            {getRoleIcon(role)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{getRoleLabel(role)}</div>
                          </div>
                          {selectedRole === role && (
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/auth")}
                        className="flex-1 h-11"
                      >
                        {t('register.back')}
                      </Button>
                      <Button
                        onClick={() => selectedRole && setRegistrationStep("details")}
                        disabled={!selectedRole}
                        className="flex-1 h-11"
                      >
                        {t('register.continue')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
              {/* Progress Indicator for Professional */}
              <div className="flex items-center justify-center gap-1.5 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    ✓
                  </div>
                  <span className="text-[10px] font-medium">{t('register.stepRole')}</span>
                </div>
                <div className="w-6 h-0.5 bg-primary"></div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    detailsSubStep === "organization" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-primary text-primary-foreground"
                  }`}>
                    {detailsSubStep === "contact" ? "✓" : "2"}
                  </div>
                  <span className={`text-[10px] ${detailsSubStep === "organization" ? "font-medium" : "font-medium"}`}>
                    {t('register.stepOrganization')}
                  </span>
                </div>
                <div className={`w-6 h-0.5 ${detailsSubStep === "contact" ? "bg-primary" : "bg-muted"}`}></div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    detailsSubStep === "contact" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    3
                  </div>
                  <span className={`text-[10px] ${detailsSubStep === "contact" ? "font-medium" : "text-muted-foreground"}`}>
                    {t('register.stepContact')}
                  </span>
                </div>
              </div>

              {detailsSubStep === "organization" ? (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRegistrationStep("role");
                      setSelectedRole(null);
                      setDetailsSubStep("organization");
                    }}
                    className="mb-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('register.changeRole')}
                  </Button>

                  <div className="text-center pb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-primary">
                        {selectedRole && getRoleIcon(selectedRole)}
                      </div>
                      <span className="font-medium text-sm">
                        {selectedRole && getRoleLabel(selectedRole)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      {t('register.organizationDetails')}
                    </h4>
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="company-name" className="text-sm">{t('register.companyName')}</Label>
                        <Input
                          id="company-name"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="business-number" className="text-sm">{t('register.businessNumber')}</Label>
                        <Input
                          id="business-number"
                          value={businessNumber}
                          onChange={(e) => setBusinessNumber(e.target.value)}
                          placeholder={t('register.registrationNumberPlaceholder')}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="address-street" className="text-sm">{t('register.addressStreet')}</Label>
                        <Input
                          id="address-street"
                          value={addressStreet}
                          onChange={(e) => setAddressStreet(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="address-postcode" className="text-sm">{t('register.postalCode')}</Label>
                          <Input
                            id="address-postcode"
                            value={addressPostcode}
                            onChange={(e) => setAddressPostcode(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="address-city" className="text-sm">{t('register.city')}</Label>
                          <Input
                            id="address-city"
                            value={addressCity}
                            onChange={(e) => setAddressCity(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setDetailsSubStep("contact")}
                    disabled={!companyName || !businessNumber || !addressStreet || !addressCity || !addressPostcode}
                    className="w-full h-10 mt-4"
                  >
                    {t('register.nextStep')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleProfessionalSignup} className="space-y-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailsSubStep("organization")}
                    className="mb-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('register.backToOrganization')}
                  </Button>

                  <div className="text-center pb-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-primary">
                        {selectedRole && getRoleIcon(selectedRole)}
                      </div>
                      <span className="font-medium text-sm">
                        {selectedRole && getRoleLabel(selectedRole)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      {t('register.contactPerson')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-first" className="text-sm">{t('auth.firstName')}</Label>
                        <Input
                          id="contact-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-last" className="text-sm">{t('auth.lastName')}</Label>
                        <Input
                          id="contact-last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-phone" className="text-sm">{t('register.phone')}</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-email" className="text-sm">{t('auth.email')}</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contact-password" className="text-sm">{t('auth.password')}</Label>
                      <Input
                        id="contact-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={12}
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground">{t('auth.minLength')}</p>
                    </div>
                  </div>

                   <Button type="submit" className="w-full h-10 mt-4" disabled={loading}>
                     {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     {t('register.submitRequest')}
                   </Button>
                 </form>
               )}
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Register;
