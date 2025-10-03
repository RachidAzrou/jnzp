import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Building2, Users, Home as HomeIcon, ArrowLeft } from "lucide-react";
import { MdOutlineMosque } from "react-icons/md";
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
  const [orgVatNumber, setOrgVatNumber] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [orgPostalCode, setOrgPostalCode] = useState("");
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

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
          vat_number: orgVatNumber,
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

      if (verificationDoc && orgData) {
        const fileName = `${orgData.id}/${Date.now()}_${verificationDoc.name}`;
        const { error: uploadError } = await supabase.storage
          .from("dossier-documents")
          .upload(fileName, verificationDoc);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("dossier-documents")
            .getPublicUrl(fileName);

          await supabase.from("organization_verification_docs").insert({
            organization_id: orgData.id,
            document_type: "KVK_UITTREKSEL",
            file_name: verificationDoc.name,
            file_url: publicUrl,
            uploaded_by: data.user.id,
          });
        }
      }

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
      setOrgVatNumber("");
      setOrgAddress("");
      setOrgCity("");
      setOrgPostalCode("");
      setVerificationDoc(null);
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

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "family": return <Users className="h-6 w-6" />;
      case "funeral_director": return <Building2 className="h-6 w-6" />;
      case "mosque": return <MdOutlineMosque className="h-6 w-6" />;
      case "wasplaats": return <HomeIcon className="h-6 w-6" />;
      case "insurer": return <Building2 className="h-6 w-6" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "family": return "Familie/Nabestaande";
      case "funeral_director": return "Uitvaartondernemer";
      case "mosque": return "Moskee";
      case "wasplaats": return "Wasplaats";
      case "insurer": return "Verzekeraar";
    }
  };

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
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Inloggen
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Registreren
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6 pt-4">
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
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {registrationStep === "role" ? (
                <div className="space-y-6 pt-4">
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Kies uw rol</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecteer de optie die het best bij u past
                    </p>
                  </div>

                  <RadioGroup value={selectedRole || ""} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                    <div className="space-y-3">
                      {(["family", "funeral_director", "mosque", "wasplaats", "insurer"] as UserRole[]).map((role) => (
                        <Label
                          key={role}
                          htmlFor={role}
                          className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <RadioGroupItem value={role} id={role} />
                          <div className="flex items-center space-x-3 flex-1">
                            {getRoleIcon(role)}
                            <span className="font-medium">{getRoleLabel(role)}</span>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>

                  <Button
                    onClick={() => selectedRole && setRegistrationStep("details")}
                    disabled={!selectedRole}
                    className="w-full h-11"
                  >
                    Volgende
                  </Button>
                </div>
              ) : (
                <div className="space-y-5 pt-4">
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
                    Terug
                  </Button>

                  <div className="text-center pb-4">
                    <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                      {selectedRole && getRoleIcon(selectedRole)}
                      {selectedRole && getRoleLabel(selectedRole)}
                    </h3>
                  </div>

                  {selectedRole === "family" ? (
                    <form onSubmit={handleFamilySignup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first-name">Voornaam</Label>
                          <Input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last-name">Achternaam</Label>
                          <Input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
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
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Registreren
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleProfessionalSignup} className="space-y-4">
                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium text-sm">Organisatiegegevens</h4>
                        <div className="space-y-2">
                          <Label htmlFor="org-name">Organisatienaam</Label>
                          <Input
                            id="org-name"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="org-vat">BTW-nummer</Label>
                          <Input
                            id="org-vat"
                            value={orgVatNumber}
                            onChange={(e) => setOrgVatNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="org-address">Adres</Label>
                          <Input
                            id="org-address"
                            value={orgAddress}
                            onChange={(e) => setOrgAddress(e.target.value)}
                            required
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="org-postal">Postcode</Label>
                            <Input
                              id="org-postal"
                              value={orgPostalCode}
                              onChange={(e) => setOrgPostalCode(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Contactpersoon</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact-first">Voornaam</Label>
                            <Input
                              id="contact-first"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-last">Achternaam</Label>
                            <Input
                              id="contact-last"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
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
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="verification-doc">
                          Upload bewijs (KVK-uittreksel, vergunning)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="verification-doc"
                            type="file"
                            onChange={(e) => setVerificationDoc(e.target.files?.[0] || null)}
                            accept=".pdf,.jpg,.jpeg,.png"
                          />
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {verificationDoc && (
                          <p className="text-sm text-muted-foreground">
                            {verificationDoc.name}
                          </p>
                        )}
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Aanvraag indienen
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Uw aanvraag wordt beoordeeld door een administrator. U ontvangt bericht zodra uw account is goedgekeurd.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
