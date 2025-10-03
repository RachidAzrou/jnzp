import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { MdOutlineMosque } from "react-icons/md";
import { LuHandshake } from "react-icons/lu";
import { RiHandHeartLine } from "react-icons/ri";
import { IoBusiness } from "react-icons/io5";
import { Users } from "lucide-react";
import logoAuth from "@/assets/logo-vertical-new.png";

type UserRole = "family" | "funeral_director" | "mosque" | "wasplaats" | "insurer";
type RegistrationStep = "role" | "details";

const Register = () => {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
    
    const code = searchParams.get("invite");
    if (code) {
      setInvitationCode(code);
      setRegistrationStep("details");
    }
  }, [navigate, searchParams]);

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

      navigate("/auth");
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

      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "org_admin",
        organization_id: orgData.id,
        scope: "ORG",
      });

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

      navigate("/auth");
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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "family": return <Users className="h-5 w-5" />;
      case "funeral_director": return <LuHandshake className="h-5 w-5" />;
      case "mosque": return <MdOutlineMosque className="h-5 w-5" />;
      case "wasplaats": return <RiHandHeartLine className="h-5 w-5" />;
      case "insurer": return <IoBusiness className="h-5 w-5" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "family": return "Familie/Nabestaande";
      case "funeral_director": return "Uitvaartondernemer";
      case "mosque": return "Moskee";
      case "wasplaats": return "Mortuarium";
      case "insurer": return "Verzekeraar";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/95 shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <img 
              src={logoAuth} 
              alt="JanazApp Logo" 
              className="h-24 w-24 object-contain animate-fade-in"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl">Registreren bij JanazApp</CardTitle>
            <CardDescription>
              Maak een account aan om aan de slag te gaan
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pb-6">
          {registrationStep === "role" ? (
            <div className="space-y-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <span className="text-xs font-medium">Kies rol</span>
                </div>
                <div className="w-12 h-0.5 bg-muted"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <span className="text-xs text-muted-foreground">Gegevens</span>
                </div>
              </div>

              <div className="text-center space-y-1 mb-4">
                <h3 className="font-semibold text-lg">Welke rol beschrijft u het best?</h3>
                <p className="text-sm text-muted-foreground">
                  Kies de optie die bij uw situatie past
                </p>
              </div>

              <div className="grid gap-2">
                {(["family", "funeral_director", "mosque", "wasplaats", "insurer"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 text-left group hover:border-primary hover:shadow-md ${
                      selectedRole === role 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg transition-colors ${
                      selectedRole === role 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {getRoleIcon(role)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{getRoleLabel(role)}</div>
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
                  Terug
                </Button>
                <Button
                  onClick={() => selectedRole && setRegistrationStep("details")}
                  disabled={!selectedRole}
                  className="flex-1 h-11"
                >
                  Doorgaan
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    ✓
                  </div>
                  <span className="text-xs font-medium">Rol</span>
                </div>
                <div className="w-12 h-0.5 bg-primary"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <span className="text-xs font-medium">Gegevens</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRegistrationStep("role");
                  setSelectedRole(null);
                }}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wijzig rol
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

              {selectedRole === "family" ? (
                <form onSubmit={handleFamilySignup} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="first-name" className="text-sm">Voornaam</Label>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name" className="text-sm">Achternaam</Label>
                      <Input
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">Minimaal 12 tekens</p>
                  </div>
                  <Button type="submit" className="w-full h-10 mt-4" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Maak account aan
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleProfessionalSignup} className="space-y-4">
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Organisatiegegevens
                    </h4>
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="org-name" className="text-sm">Organisatienaam</Label>
                        <Input
                          id="org-name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="org-registration" className="text-sm">Ondernemingsnummer</Label>
                        <Input
                          id="org-registration"
                          value={orgRegistrationNumber}
                          onChange={(e) => setOrgRegistrationNumber(e.target.value)}
                          placeholder="Bv. 0123.456.789"
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="org-address" className="text-sm">Adres</Label>
                        <Input
                          id="org-address"
                          value={orgAddress}
                          onChange={(e) => setOrgAddress(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="org-city" className="text-sm">Stad</Label>
                          <Input
                            id="org-city"
                            value={orgCity}
                            onChange={(e) => setOrgCity(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="org-postal" className="text-sm">Postcode</Label>
                          <Input
                            id="org-postal"
                            value={orgPostalCode}
                            onChange={(e) => setOrgPostalCode(e.target.value)}
                            required
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      Contactpersoon
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-first" className="text-sm">Voornaam</Label>
                        <Input
                          id="contact-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-last" className="text-sm">Achternaam</Label>
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
                      <Label htmlFor="contact-phone" className="text-sm">Telefoon</Label>
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
                      <Label htmlFor="contact-email" className="text-sm">E-mail</Label>
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
                      <Label htmlFor="contact-password" className="text-sm">Wachtwoord</Label>
                      <Input
                        id="contact-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={12}
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground">Minimaal 12 tekens</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-10 mt-4" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Dien aanvraag in
                  </Button>

                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <p className="text-xs text-blue-900 dark:text-blue-100 text-center leading-relaxed">
                      Uw aanvraag wordt beoordeeld door een administrator. U ontvangt bericht zodra uw account is goedgekeurd.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;