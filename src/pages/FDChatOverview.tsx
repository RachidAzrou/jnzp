import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search, ExternalLink, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

type DossierWithMessages = {
  id: string;
  display_id: string;
  deceased_name: string;
  family_contact_name: string | null;
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

      // For each dossier, get the thread, family contact, and unread message count
      const dossiersWithMessages = await Promise.all(
        (dossiersData || []).map(async (dossier) => {
          // Get family contact for this dossier
          const { data: familyContact } = await supabase
            .from("family_contacts")
            .select("name")
            .eq("dossier_id", dossier.id)
            .maybeSingle();

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
            family_contact_name: familyContact?.name || null,
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
    d.display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.family_contact_name && d.family_contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Chat Overzicht</h1>
          <p className="text-muted-foreground">
            Communiceer met families per dossier
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredDossiers.length} {filteredDossiers.length === 1 ? 'dossier' : 'dossiers'}
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of dossier nummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Chat List */}
      <div className="space-y-3">
        {filteredDossiers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-1">Geen chats gevonden</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Probeer een andere zoekterm' : 'Start een chat door een dossier te openen'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDossiers.map((dossier) => (
            <Card
              key={dossier.id}
              className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
              onClick={() => navigate(`/chat/${dossier.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Main Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                          {dossier.family_contact_name || dossier.deceased_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            {dossier.display_id}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {dossier.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info Row */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pl-15">
                      {dossier.family_contact_name && dossier.family_contact_name !== dossier.deceased_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate">{dossier.deceased_name}</span>
                        </div>
                      )}
                      {dossier.last_message_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {format(new Date(dossier.last_message_at), "d MMM, HH:mm", { locale: nl })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & Badge */}
                  <div className="flex flex-col items-end gap-3">
                    {dossier.unread_count > 0 && (
                      <Badge className="bg-primary text-primary-foreground">
                        {dossier.unread_count} nieuw
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${dossier.id}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
