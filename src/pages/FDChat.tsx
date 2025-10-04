import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Message {
  id: string;
  sender_user_id: string;
  sender_role: string;
  message: string;
  channel: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
}

interface DossierInfo {
  id: string;
  display_id: string | null;
  ref_number: string;
  deceased_name: string;
  status: string;
  flow: string;
}

export default function FDChat() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [dossier, setDossier] = useState<DossierInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      if (!dossierId) {
        navigate('/dashboard');
        return;
      }

      // Get dossier
      const { data: dossierData } = await supabase
        .from('dossiers')
        .select('id, display_id, ref_number, deceased_name, status, flow')
        .eq('id', dossierId)
        .maybeSingle();

      if (dossierData) {
        setDossier(dossierData);
        await fetchMessages(dossierData.id);
      }

      setLoading(false);
    };

    fetchChatData();
  }, [navigate, dossierId]);

  const fetchMessages = async (dossierId: string) => {
    const { data: messagesData } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: true });

    setMessages(messagesData || []);
  };

  // Realtime subscription
  useEffect(() => {
    if (!dossier) return;

    const channel = supabase
      .channel('fd_chat_messages_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `dossier_id=eq.${dossier.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossier]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!dossier) return;

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      // Get last channel preference
      const { data: prefData } = await supabase
        .from('dossier_communication_preferences')
        .select('last_channel_used, whatsapp_phone')
        .eq('dossier_id', dossier.id)
        .maybeSingle();

      const targetChannel = prefData?.last_channel_used || 'PORTAL';

      // Insert message
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          dossier_id: dossier.id,
          sender_user_id: session.user.id,
          sender_role: roleData?.role || 'funeral_director',
          channel: targetChannel as any,
          message: newMessage.trim(),
        });

      if (insertError) throw insertError;

      // If target channel is WhatsApp, send via WhatsApp API
      if (targetChannel === 'WHATSAPP' && prefData?.whatsapp_phone) {
        // TODO: Call WhatsApp API to send message
        console.log('TODO: Send WhatsApp message to', prefData.whatsapp_phone);
      }

      // Reset form
      setNewMessage("");

      toast({
        title: "Bericht verzonden",
        description: `Verzonden via ${targetChannel === 'WHATSAPP' ? 'WhatsApp' : 'Portal'}`,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fout",
        description: "Bericht kon niet worden verzonden",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "HH:mm", { locale: nl });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, "d MMM", { locale: nl });
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      family: 'Familie',
      funeral_director: 'Uitvaartondernemer',
      admin: 'Admin',
      insurer: 'Verzekeraar'
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/fd/chat')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Chat — Dossier {dossier?.display_id || dossier?.ref_number}
          </h1>
          <p className="text-muted-foreground mt-1">
            {dossier?.deceased_name || 'Nog in te vullen'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,300px] gap-6">
        {/* Chat Thread */}
        <Card className="flex flex-col h-[600px]">
          <CardHeader>
            <CardTitle>Conversatie</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nog geen berichten</p>
                  <p className="text-sm mt-2">Start een conversatie met de familie</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const showDate = index === 0 || 
                    formatDate(msg.created_at) !== formatDate(messages[index - 1].created_at);

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex flex-col gap-1 p-3 rounded-lg max-w-[80%]",
                          msg.sender_role === 'funeral_director'
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs opacity-80">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getRoleName(msg.sender_role)}</span>
                            {msg.channel === 'WHATSAPP' && (
                              <Badge className="bg-green-500 text-white text-[10px] h-4 px-1.5">
                                WhatsApp
                              </Badge>
                            )}
                            {msg.channel === 'PORTAL' && (
                              <Badge className="bg-blue-500 text-white text-[10px] h-4 px-1.5">
                                Portal
                              </Badge>
                            )}
                          </div>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs underline mt-1"
                          >
                            <Paperclip className="h-3 w-3" />
                            {msg.attachment_name}
                            {msg.attachment_type && (
                              <span className="text-[10px] opacity-70">
                                ({msg.attachment_type})
                              </span>
                            )}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Box */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Typ uw antwoord..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="flex-1"
                >
                  {sending ? (
                    "Versturen..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Verstuur
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Antwoord wordt automatisch verzonden via het laatst gebruikte kanaal van de familie
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dossier Context */}
        {dossier && (
          <Card>
            <CardHeader>
              <CardTitle>Dossier Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Overledene</p>
                <p className="font-medium">{dossier.deceased_name || 'Nog in te vullen'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dossier-ID</p>
                <p className="font-medium font-mono">{dossier.display_id || dossier.ref_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{dossier.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">
                  {dossier.flow === 'REP' ? 'Repatriëring' : dossier.flow === 'LOC' ? 'Lokaal' : 'Onbekend'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
