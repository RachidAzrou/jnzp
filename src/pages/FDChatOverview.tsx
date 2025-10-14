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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  useEffect(() => {
    fetchDossiers();
  }, []);

  const fetchDossiers = async () => {
    try {
      const { data: dossiersData, error } = await supabase
        .from("dossiers")
        .select("id, display_id, deceased_name, status")
        .is("deleted_at", null)
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
        title: t("common.error"),
        description: t("fdChatOverview.loadError"),
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
    <div className="space-y-6 pb-8">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{t("fdChatOverview.communication")}</p>
                  <h1 className="text-2xl font-bold tracking-tight">{t("fdChatOverview.title")}</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                {t("fdChatOverview.description")}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className="text-sm px-4 py-1.5 bg-primary/10 text-primary border-primary/20"
              >
                {filteredDossiers.length} {filteredDossiers.length === 1 ? t("dossiers.dossier") : t("dossiers.dossiers")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Card */}
      <Card className="animate-fade-in">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("fdChatOverview.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chat List Card */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg">{t("fdChatOverview.dossierChats")}</CardTitle>
          <CardDescription>{t("fdChatOverview.selectDossier")}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {filteredDossiers.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium mb-1">{t("fdChatOverview.noChats")}</p>
              <p className="text-sm">
                {searchTerm ? t("fdChatOverview.tryDifferentSearch") : t("fdChatOverview.startChat")}
              </p>
            </div>
          ) : (
            filteredDossiers.map((dossier) => (
              <div
                key={dossier.id}
                className="group rounded-lg border bg-card p-4 cursor-pointer hover:shadow-sm hover:border-primary/50 transition-all duration-200"
                onClick={() => navigate(`/chat/${dossier.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Main Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-base group-hover:text-primary transition-colors truncate">
                          {dossier.family_contact_name || dossier.deceased_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pl-13">
                      {dossier.family_contact_name && dossier.family_contact_name !== dossier.deceased_name && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span className="truncate">{dossier.deceased_name}</span>
                        </div>
                      )}
                      {dossier.last_message_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(dossier.last_message_at), "d MMM, HH:mm", { locale: nl })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & Badge */}
                  <div className="flex flex-col items-end gap-2">
                    {dossier.unread_count > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {dossier.unread_count} {t("fdChatOverview.new")}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${dossier.id}`);
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      {t("common.open")}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
