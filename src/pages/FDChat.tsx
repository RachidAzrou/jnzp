import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Download, X } from "lucide-react";
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
  family_contact_name: string | null;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      // Get dossier first
      const { data: dossierData, error: dossierError } = await supabase
        .from('dossiers')
        .select('id, display_id, ref_number, deceased_name, status, flow')
        .eq('id', dossierId)
        .maybeSingle();

      if (dossierError) {
        console.error('Error fetching dossier:', dossierError);
      }

      // Get family contact separately
      let familyContactName = null;
      if (dossierData) {
        const { data: familyContact } = await supabase
          .from('family_contacts')
          .select('name')
          .eq('dossier_id', dossierId)
          .maybeSingle();
        
        familyContactName = familyContact?.name || null;
      }

      // Transform the data to include family contact name
      const transformedDossier = dossierData ? {
        ...dossierData,
        family_contact_name: familyContactName,
      } : null;

      if (transformedDossier) {
        setDossier(transformedDossier);
        await fetchMessages(transformedDossier.id);
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
    if ((!newMessage.trim() && !selectedFile) || !dossier) return;

    try {
      setSending(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();

      let attachment_url = null;
      let attachment_name = null;
      let attachment_type = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${dossier.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('dossier-documents')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        attachment_url = uploadData.path;
        attachment_name = selectedFile.name;
        attachment_type = selectedFile.type;
      }

      // Insert message
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          dossier_id: dossier.id,
          sender_user_id: session.user.id,
          sender_role: roleData?.role || 'funeral_director',
          channel: 'PORTAL',
          message: newMessage.trim() || (selectedFile ? `[Bijlage: ${selectedFile.name}]` : ''),
          attachment_url,
          attachment_name,
          attachment_type,
        });

      if (insertError) throw insertError;

      // Reset form
      setNewMessage("");
      setSelectedFile(null);

      toast({
        title: "Bericht verzonden",
        description: "Uw bericht is verstuurd",
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Bestand te groot",
          description: "Maximale bestandsgrootte is 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDownloadAttachment = async (url: string, name: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('dossier-documents')
        .download(url);

      if (error) throw error;

      // Create download link
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Fout",
        description: "Bestand kon niet worden gedownload",
        variant: "destructive",
      });
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
          variant="outline"
          size="default"
          onClick={() => navigate('/fd/chat')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Terug naar overzicht</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Chat — Dossier {dossier?.display_id || dossier?.ref_number}
          </h1>
          <p className="text-muted-foreground mt-1">
            {dossier?.family_contact_name || dossier?.deceased_name || 'Nog in te vullen'}
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
                            <Badge className="bg-blue-500 text-white text-[10px] h-4 px-1.5">
                              Portal
                            </Badge>
                          </div>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        {msg.attachment_url && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleDownloadAttachment(msg.attachment_url!, msg.attachment_name!)}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            {msg.attachment_name}
                            {msg.attachment_type && (
                              <span className="text-[10px] ml-2 opacity-70">
                                ({msg.attachment_type.split('/')[1]?.toUpperCase()})
                              </span>
                            )}
                          </Button>
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
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm flex-1">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Bijlage
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || (!newMessage.trim() && !selectedFile)}
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
                💡 Berichten worden verzonden via het portal
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
