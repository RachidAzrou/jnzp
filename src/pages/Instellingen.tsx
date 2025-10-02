import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Building2, Bell } from "lucide-react";

const Instellingen = () => {
  const [profile, setProfile] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [organization, setOrganization] = useState({
    name: "",
    type: "",
    contactEmail: "",
    contactPhone: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile({
          email: profileData.email || "",
          firstName: profileData.first_name || "",
          lastName: profileData.last_name || "",
          phone: profileData.phone || ""
        });
      }

      // Fetch organization info
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", roleData.organization_id)
          .single();

        if (orgData) {
          const roleLabels: Record<string, string> = {
            admin: 'Beheerder',
            funeral_director: 'Uitvaartondernemer',
            insurer: 'Verzekeraar',
            wasplaats: 'Wasplaats',
            mosque: 'Moskee',
            family: 'Familie'
          };

          setOrganization({
            name: orgData.name || "",
            type: roleLabels[roleData.role] || roleData.role,
            contactEmail: orgData.contact_email || "",
            contactPhone: orgData.contact_phone || ""
          });
        }
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const updates: any = {
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone
      };

      // Only update email if it's different from the current one
      if (profile.email !== session.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });

        if (emailError) {
          toast({
            title: "Fout bij opslaan e-mail",
            description: emailError.message,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        updates.email = profile.email;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);

      if (error) {
        toast({
          title: "Fout bij opslaan",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profiel bijgewerkt",
          description: "Uw gegevens zijn succesvol opgeslagen.",
        });
      }
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Instellingen</h1>
        <p className="text-muted-foreground mt-1">Configureer uw account en voorkeuren</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profiel gegevens
            </CardTitle>
            <CardDescription>Beheer uw persoonlijke informatie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Voornaam</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Achternaam</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+32 xxx xx xx xx"
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisatie
            </CardTitle>
            <CardDescription>Uw organisatie informatie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Organisatie naam</p>
                <p className="font-medium">{organization.name || "Niet beschikbaar"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{organization.type || "Niet beschikbaar"}</p>
              </div>
              {organization.contactEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact e-mail</p>
                  <p className="font-medium">{organization.contactEmail}</p>
                </div>
              )}
              {organization.contactPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact telefoon</p>
                  <p className="font-medium">{organization.contactPhone}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Organisatiegegevens kunnen niet worden gewijzigd. Neem contact op met de beheerder voor wijzigingen.
            </p>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaties
            </CardTitle>
            <CardDescription>Beheer uw notificatie voorkeuren</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">E-mail notificaties</p>
                <p className="text-sm text-muted-foreground">
                  Ontvang updates over dossiers en taken
                </p>
              </div>
              <Button variant="outline" size="sm">Ingeschakeld</Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Document goedkeuringen</p>
                <p className="text-sm text-muted-foreground">
                  Notificaties bij document reviews
                </p>
              </div>
              <Button variant="outline" size="sm">Ingeschakeld</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Instellingen;
