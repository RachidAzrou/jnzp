import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Monitor } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type PublicAnnouncement = {
  id: string;
  title_nl: string;
  title_ar: string;
  body_nl: string;
  body_ar: string;
  visible_until: string | null;
  created_at: string;
};

export default function MoskeePublicScreen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLanguage, setSelectedLanguage] = useState<'nl' | 'ar'>('nl');

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

  // Fetch public feed
  const { data: publicFeed } = useQuery({
    queryKey: ["public-feed", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_feeds" as any)
        .select("*")
        .eq("mosque_org_id", userOrgs!.organization_id)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery({
    queryKey: ["public-announcements", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_announcements" as any)
        .select("*")
        .eq("mosque_org_id", userOrgs!.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any as PublicAnnouncement[];
    },
  });

  // Generate/regenerate token
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      if (publicFeed) {
        // Update existing
        const { error } = await supabase
          .from("public_feeds" as any)
          .update({ token })
          .eq("id", publicFeed.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("public_feeds" as any)
          .insert({
            mosque_org_id: userOrgs!.organization_id,
            token,
            theme: {},
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-feed"] });
      toast({ title: publicFeed ? "Token vernieuwd" : "Token aangemaakt" });
    },
    onError: (error) => {
      toast({ title: "Fout", description: String(error), variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Gekopieerd naar klembord" });
  };

  const publicUrl = publicFeed
    ? `${window.location.origin}/public/mosque/${publicFeed.token}`
    : "";

  const visibleAnnouncements = announcements?.filter(
    (a) => !a.visible_until || new Date(a.visible_until) > new Date()
  );

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Moskee</p>
              <h1 className="text-2xl font-bold tracking-tight">Publiek Scherm</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3 pl-15">Beheer publieke mededelingen en TV-scherm instellingen</p>
        </CardContent>
      </Card>

      {/* Token & URL */}
      <Card>
        <CardHeader>
          <CardTitle>Publieke Feed URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!publicFeed ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">Geen publieke feed. Genereer een token om te starten.</p>
              <Button onClick={() => generateTokenMutation.mutate()}>
                <Monitor className="mr-2 h-4 w-4" />
                Token Aanmaken
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(publicUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => generateTokenMutation.mutate()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Open deze URL op een TV/monitor om de publieke mededelingen weer te geven.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Voorbeeld Mededelingen</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedLanguage === 'nl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage('nl')}
              >
                Nederlands
              </Button>
              <Button
                variant={selectedLanguage === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage('ar')}
              >
                العربية
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : !visibleAnnouncements?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Geen zichtbare mededelingen. Deze worden automatisch aangemaakt bij bevestiging janazah.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAnnouncements.map((ann) => (
                <div key={ann.id} className="border rounded-lg p-4 bg-card" dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}>
                  <h3 className="font-bold text-lg mb-2">
                    {selectedLanguage === 'nl' ? ann.title_nl : ann.title_ar}
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    {selectedLanguage === 'nl' ? ann.body_nl : ann.body_ar}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Zichtbaar tot:{" "}
                    {ann.visible_until
                      ? format(new Date(ann.visible_until), "dd MMM yyyy HH:mm", { locale: nl })
                      : "Onbeperkt"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
