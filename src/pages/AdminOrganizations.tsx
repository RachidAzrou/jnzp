import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { OrganizationVerificationCard } from "@/components/admin/OrganizationVerificationCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Organization {
  id: string;
  name: string;
  type: string;
  verification_status: string;
  provisional: boolean;
  created_at: string;
  contact_email?: string;
  contact_phone?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  business_number?: string;
  address_street?: string;
  address_city?: string;
  address_postcode?: string;
}

export default function AdminOrganizations() {
  const { data: organizations, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Organization[];
    },
  });

  const pendingOrgs = organizations?.filter(o => o.verification_status === "PENDING") || [];
  const reviewRequiredOrgs = organizations?.filter(o => o.verification_status === "REVIEW_REQUIRED") || [];
  const activeOrgs = organizations?.filter(o => o.verification_status === "ACTIVE") || [];
  const rejectedOrgs = organizations?.filter(o => o.verification_status === "REJECTED") || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Organisaties</h1>
          <p className="text-muted-foreground mt-2">
            Beheer organisatie verificaties en activering
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organisaties</h1>
        <p className="text-muted-foreground mt-2">
          Beheer organisatie verificaties en activering
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In afwachting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{pendingOrgs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Extra info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{reviewRequiredOrgs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{activeOrgs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Afgewezen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{rejectedOrgs.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different statuses */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            In afwachting ({pendingOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Extra info ({reviewRequiredOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Actief ({activeOrgs.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Afgewezen ({rejectedOrgs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingOrgs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen organisaties in afwachting</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingOrgs.map((org) => (
                <OrganizationVerificationCard key={org.id} organization={org} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          {reviewRequiredOrgs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen organisaties met extra info aanvraag</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviewRequiredOrgs.map((org) => (
                <OrganizationVerificationCard key={org.id} organization={org} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeOrgs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen actieve organisaties</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeOrgs.map((org) => (
                <OrganizationVerificationCard key={org.id} organization={org} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedOrgs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen afgewezen organisaties</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rejectedOrgs.map((org) => (
                <OrganizationVerificationCard key={org.id} organization={org} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
