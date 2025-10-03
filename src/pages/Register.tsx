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
      
      <Card className="w-full max-w-2xl relative backdrop-blur-sm bg-card/95 shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <img 
              src={logoAuth} 
              alt="JanazApp Logo" 
              className="h-32 w-32 object-contain animate-fade-in"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Registreren bij JanazApp</CardTitle>
            <CardDescription className="text-base">
              Maak een account aan om aan de slag te gaan
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pb-8">
          {registrationStep === "role" ? (
            <div className="space-y-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    1
                  </div>
                  <span className="text-sm font-medium">Kies rol</span>
                </div>
                <div className="w-16 h-0.5 bg-muted"></div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium">
                    2
                  </div>
                  <span className="text-sm text-muted-foreground">Gegevens</span>
                </div>
              </div>

              <div className="text-center space-y-2 mb-8">
                <h3 className="font-semibold text-2xl">Welke rol beschrijft u het best?</h3>
                <p className="text-muted-foreground">
                  Kies de optie die bij uw situatie past
                </p>
              </div>

              <div className="grid gap-4 max-w-xl mx-auto">
                {(["family", "funeral_director", "mosque", "wasplaats", "insurer"] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`relative flex items-center gap-4 p-6 rounded-xl border-2 transition-all duration-200 text-left group hover:border-primary hover:shadow-lg ${
                      selectedRole === role 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className={`p-4 rounded-lg transition-colors ${
                      selectedRole === role 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                    }`}>
                      {getRoleIcon(role)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-lg">{getRoleLabel(role)}</div>
                    </div>
                    {selectedRole === role && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 max-w-xl mx-auto mt-8">
                <Button
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="flex-1 h-12"
                >
                  Terug naar inloggen
                </Button>
                <Button
                  onClick={() => selectedRole && setRegistrationStep("details")}
                  disabled={!selectedRole}
                  className="flex-1 h-12 text-base"
                >
                  Doorgaan naar gegevens
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    ✓
                  </div>
                  <span className="text-sm font-medium">Rol</span>
                </div>
                <div className="w-16 h-0.5 bg-primary"></div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    2
                  </div>
                  <span className="text-sm font-medium">Gegevens</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRegistrationStep("role");
                  setSelectedRole(null);
                }}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Wijzig rol
              </Button>

              <div className="text-center pb-6">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="text-primary">
                    {selectedRole && getRoleIcon(selectedRole)}
                  </div>
                  <span className="font-semibold text-lg">
                    {selectedRole && getRoleLabel(selectedRole)}
                  </span>
                </div>
              </div>

              {selectedRole === "family" ? (
                <form onSubmit={handleFamilySignup} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">Voornaam</Label>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Achternaam</Label>
                      <Input
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoonnummer</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mailadres</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Wachtwoord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">Minimaal 12 tekens</p>
                  </div>
                  <Button type="submit" className="w-full h-12 mt-6" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Maak account aan
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleProfessionalSignup} className="space-y-6">
                  <div className="space-y-4 p-6 bg-muted/30 rounded-xl border">
                    <h4 className="font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      Organisatiegegevens
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organisatienaam</Label>
                        <Input
                          id="org-name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-registration">Ondernemingsnummer</Label>
                        <Input
                          id="org-registration"
                          value={orgRegistrationNumber}
                          onChange={(e) => setOrgRegistrationNumber(e.target.value)}
                          placeholder="Bv. 0123.456.789"
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-address">Adres</Label>
                        <Input
                          id="org-address"
                          value={orgAddress}
                          onChange={(e) => setOrgAddress(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="org-city">Stad</Label>
                          <Input
                            id="org-city"
                            value={orgCity}
                            onChange={(e) => setOrgCity(e.target.value)}
                            required
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="org-postal">Postcode</Label>
                          <Input
                            id="org-postal"
                            value={orgPostalCode}
                            onChange={(e) => setOrgPostalCode(e.target.value)}
                            required
                            className="h-11"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      Contactpersoon
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact-first">Voornaam</Label>
                        <Input
                          id="contact-first"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact-last">Achternaam</Label>
                        <Input
                          id="contact-last"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Telefoon</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">E-mail</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-password">Wachtwoord</Label>
                      <Input
                        id="contact-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={12}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">Minimaal 12 tekens</p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 mt-6" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Dien aanvraag in
                  </Button>

                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
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