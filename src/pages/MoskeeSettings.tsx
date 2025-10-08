import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function MoskeeSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orgName, setOrgName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [imamName, setImamName] = useState("");

  // Fetch user's mosque org
  const { data: userOrgs } = useQuery({
    queryKey: ["user-mosque-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mosque")
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch organization
  const { data: organization, isLoading } = useQuery({
    queryKey: ["mosque-org", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userOrgs!.organization_id)
        .single();

      if (error) throw error;
      
      // Set form values
      setOrgName(data.name || "");
      setAddress(data.address || "");
      setContactEmail(data.contact_email || "");
      setContactPhone(data.contact_phone || "");
      setImamName(((data as any).metadata as any)?.imam_name || "");
      
      return data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName,
          address,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          metadata: {
            ...(((organization as any)?.metadata as any) || {}),
            imam_name: imamName,
          } as any,
        })
        .eq("id", userOrgs!.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mosque-org"] });
      toast({ title: "Instellingen opgeslagen" });
    },
    onError: (error) => {
      toast({ title: "Fout bij opslaan", description: String(error), variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Instellingen</h1>
        <p className="text-muted-foreground">Beheer moskee-informatie en voorkeuren</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moskee Informatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Naam Moskee</label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Bijv. Al-Fatih Moskee"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Adres</label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Straat, postcode, plaats"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contact E-mail</label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@moskee.nl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contact Telefoon</label>
                <Input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+31 6 12345678"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Naam Imam</label>
                <Input
                  value={imamName}
                  onChange={(e) => setImamName(e.target.value)}
                  placeholder="Sheikh ..."
                />
              </div>

              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Opslaan..." : "Opslaan"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
