import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DossierWithMessages = {
  id: string;
  display_id: string;
  deceased_name: string;
  status: string;
  unread_count: number;
  last_message_at: string | null;
};

export default function FDChatOverview() {
  const [dossiers, setDossiers] = useState<DossierWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDossiers();
  }, []);

  const fetchDossiers = async () => {
    try {
      const { data: dossiersData, error } = await supabase
        .from("dossiers")
        .select("id, display_id, deceased_name, status")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For each dossier, get the thread and unread message count
      const dossiersWithMessages = await Promise.all(
        (dossiersData || []).map(async (dossier) => {
          // Get family thread for this dossier
          const { data: thread } = await supabase
            .from("threads")
            .select("id, last_message_at")
            .eq("dossier_id", dossier.id)
            .eq("type", "dossier_family")
            .single();

          // Count unread messages (simplified - in production, track per user)
          let unread_count = 0;
          if (thread) {
            const { count } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("thread_id", thread.id);
            
            unread_count = count || 0;
          }

          return {
            ...dossier,
            unread_count,
            last_message_at: thread?.last_message_at || null,
          };
        })
      );

      setDossiers(dossiersWithMessages);
    } catch (error: any) {
      console.error("Error fetching dossiers:", error);
      toast({
        title: "Fout",
        description: "Kon dossiers niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDossiers = dossiers.filter((d) =>
    d.deceased_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.display_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Berichten</h1>
        <p className="text-muted-foreground">
          Communiceer met families per dossier
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of dossier nummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filteredDossiers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Geen dossiers gevonden</p>
            </CardContent>
          </Card>
        ) : (
          filteredDossiers.map((dossier) => (
            <Card
              key={dossier.id}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/chat/${dossier.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {dossier.deceased_name}
                    </CardTitle>
                    <CardDescription>
                      Dossier: {dossier.display_id}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {dossier.unread_count > 0 && (
                      <Badge variant="default">
                        {dossier.unread_count} nieuw
                      </Badge>
                    )}
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
