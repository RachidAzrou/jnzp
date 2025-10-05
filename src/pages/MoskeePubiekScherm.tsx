import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Monitor, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MoskeePubiekScherm() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["user-role-mosque"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .eq("role", "mosque")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: mosque } = useQuery({
    queryKey: ["mosque-org", userRole?.organization_id],
    queryFn: async () => {
      if (!userRole?.organization_id) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", userRole.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.organization_id,
  });

  const { data: upcomingServices } = useQuery({
    queryKey: ["upcoming-janaza", userRole?.organization_id],
    queryFn: async () => {
      if (!userRole?.organization_id) return [];

      const { data, error } = await supabase
        .from("mosque_services")
        .select(`
          *,
          dossier:dossiers(
            deceased_name,
            deceased_dob,
            date_of_death
          )
        `)
        .eq("mosque_org_id", userRole.organization_id)
        .eq("status", "CONFIRMED")
        .gte("confirmed_slot", new Date().toISOString())
        .order("confirmed_slot", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userRole?.organization_id,
  });

  const publicUrl = mosque?.slug 
    ? `${window.location.origin}/screen/${mosque.slug}`
    : "";

  const handleCopyUrl = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: "Gekopieerd",
        description: "URL is gekopieerd naar klembord",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenScreen = () => {
    if (publicUrl) {
      // Open in new tab/window
      window.open(publicUrl, "_blank");
      
      toast({
        title: "Publiek scherm geopend",
        description: "Druk op F11 in het nieuwe venster voor volledig scherm",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Publiek Scherm</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toon aankomende Janaza-gebeden op een publiek scherm in uw moskee
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Publieke weergave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Publieke URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background px-3 py-2 rounded text-sm">
                  {publicUrl || "Laden..."}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyUrl}
                  disabled={!publicUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Deze URL kan gebruikt worden om het publieke scherm te tonen op een TV, beamer of kiosk
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleOpenScreen}
                disabled={!publicUrl}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open publiek scherm
              </Button>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Tips voor gebruik:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Klik op "Open publiek scherm" voor automatische fullscreen weergave</li>
                  <li>Of open de URL handmatig en druk op F11 voor fullscreen</li>
                  <li>Het scherm vernieuwt automatisch elke 60 seconden</li>
                  <li>Enkel bevestigde Janaza-gebeden worden getoond</li>
                  <li>Gebeden van de afgelopen 3 dagen worden ook getoond</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  💡 Let op: Voor beste resultaten gebruik je een dedicated display device (TV, beamer, kiosk) in landscape mode.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Aankomende gebeden ({upcomingServices?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingServices && upcomingServices.length > 0 ? (
              <div className="space-y-3">
                {upcomingServices.map((service) => (
                  <div
                    key={service.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-lg">
                          {service.dossier?.deceased_name || "Onbekend"}
                        </p>
                        {service.dossier?.deceased_dob && (
                          <p className="text-sm text-muted-foreground">
                            Leeftijd: {new Date().getFullYear() - new Date(service.dossier.deceased_dob).getFullYear()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(service.confirmed_slot!).toLocaleDateString("nl-NL", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(service.confirmed_slot!).toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {service.note && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {service.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                Geen aankomende gebeden gepland
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
