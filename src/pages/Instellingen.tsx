import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { User, Building2, Bell, Shield } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { GDPRRequestPanel } from "@/components/GDPRRequestPanel";
import { Link } from "react-router-dom";

const Instellingen = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
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
    contactPhone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    vatNumber: "",
    registrationNumber: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [must2FASetup, setMust2FASetup] = useState(false);
  const { toast } = useToast();
  const { role } = useUserRole();

  useEffect(() => {
    fetchProfile();
    
    // Check if forced 2FA setup
    const setup2fa = searchParams.get('setup2fa');
    if (setup2fa === 'true') {
      setMust2FASetup(true);
    }
  }, [searchParams]);

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
            wasplaats: 'Mortuarium',
            mosque: 'Moskee',
            family: 'Familie'
          };

          setOrganization({
            name: orgData.name || "",
            type: roleLabels[roleData.role] || roleData.role,
            contactEmail: orgData.contact_email || "",
            contactPhone: orgData.contact_phone || "",
            address: orgData.address || "",
            city: orgData.city || "",
            postalCode: orgData.postal_code || "",
            country: orgData.country || "België",
            vatNumber: orgData.vat_number || "",
            registrationNumber: orgData.registration_number || ""
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
            title: t("settings.errorSavingEmail"),
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
          title: t("settings.errorSaving"),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t("settings.profileUpdated"),
          description: t("settings.profileUpdatedDesc"),
        });
      }
    }
    
    setSaving(false);
  };

  const handleSaveOrganization = async () => {
    setSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (roleData?.organization_id) {
        const { error } = await supabase
          .from("organizations")
          .update({
            name: organization.name,
            contact_email: organization.contactEmail,
            contact_phone: organization.contactPhone,
            address: organization.address,
            city: organization.city,
            postal_code: organization.postalCode,
            country: organization.country,
            vat_number: organization.vatNumber,
            registration_number: organization.registrationNumber
          })
          .eq("id", roleData.organization_id);

        if (error) {
          toast({
            title: t("settings.errorSaving"),
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: t("settings.organizationUpdated"),
            description: t("settings.organizationUpdatedDesc"),
          });
        }
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
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {t("settings.title")}
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                {t("settings.profileData")}
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("settings.firstName")}</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("settings.lastName")}</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("settings.phone")}</Label>
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
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {t("settings.organizationData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgName">{t("settings.organizationName")}</Label>
                <Input
                  id="orgName"
                  value={organization.name}
                  onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgType">{t("settings.type")}</Label>
                <Input
                  id="orgType"
                  value={organization.type}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgAddress">{t("settings.address")}</Label>
              <Input
                id="orgAddress"
                value={organization.address}
                onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                placeholder={t("settings.addressPlaceholder")}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgPostalCode">{t("settings.postalCode")}</Label>
                <Input
                  id="orgPostalCode"
                  value={organization.postalCode}
                  onChange={(e) => setOrganization({ ...organization, postalCode: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgCity">{t("settings.city")}</Label>
                <Input
                  id="orgCity"
                  value={organization.city}
                  onChange={(e) => setOrganization({ ...organization, city: e.target.value })}
                  placeholder="Brussel"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgCountry">{t("settings.country")}</Label>
              <Input
                id="orgCountry"
                value={organization.country}
                onChange={(e) => setOrganization({ ...organization, country: e.target.value })}
                placeholder="België"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgEmail">{t("settings.email")}</Label>
                <Input
                  id="orgEmail"
                  type="email"
                  value={organization.contactEmail}
                  onChange={(e) => setOrganization({ ...organization, contactEmail: e.target.value })}
                  placeholder="info@organisatie.be"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgPhone">{t("settings.phone")}</Label>
                <Input
                  id="orgPhone"
                  type="tel"
                  value={organization.contactPhone}
                  onChange={(e) => setOrganization({ ...organization, contactPhone: e.target.value })}
                  placeholder="+32 xxx xx xx xx"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgVat">{t("settings.vatNumber")}</Label>
              <Input
                id="orgVat"
                value={organization.vatNumber}
                onChange={(e) => setOrganization({ ...organization, vatNumber: e.target.value })}
                placeholder="BE0123456789"
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveOrganization} disabled={saving}>
                {saving ? t("settings.saving") : t("common.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2FA Settings - Only for professional users */}
        {role && ['funeral_director', 'org_admin', 'platform_admin', 'wasplaats', 'mosque', 'insurer'].includes(role) && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
                {t("settings.twoFactorAuth")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {must2FASetup && (
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    {t("settings.must2FASetup")}
                  </AlertDescription>
                </Alert>
              )}
              <TwoFactorSetup />
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {t("settings.notifications")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t("settings.emailNotifications")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.emailNotificationsDesc")}
                </p>
              </div>
              <Button variant="outline" size="sm">{t("settings.enabled")}</Button>
            </div>

            {role !== 'wasplaats' && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("settings.documentApprovals")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.documentApprovalsDesc")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">{t("settings.enabled")}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* GDPR & Privacy */}
        <GDPRRequestPanel />

        {/* Legal Documents */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{t("settings.legalDocuments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/privacy" target="_blank">
              <Button variant="outline" className="w-full justify-start">
                {t("settings.privacyPolicy")}
              </Button>
            </Link>
            <Link to="/terms" target="_blank">
              <Button variant="outline" className="w-full justify-start">
                {t("settings.termsOfService")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
};

export default Instellingen;
