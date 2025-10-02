import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Send, Paperclip, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

export default function FamilieChat() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [dossier, setDossier] = useState<DossierInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchChatData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Get dossier (assuming family has one active dossier)
      const { data: dossierData } = await supabase
        .from('dossiers')
        .select('id, display_id, ref_number, deceased_name, status, flow')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dossierData) {
        setDossier(dossierData);
        await fetchMessages(dossierData.id);
      }

      setLoading(false);
    };

    fetchChatData();
  }, [navigate]);

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
      .channel('chat_messages_channel')
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
    if (!newMessage.trim() && !file) return;
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

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentType = null;

      // Upload file if present
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${dossier.id}/chat/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dossier-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dossier-documents')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = file.name;
        
        // Determine attachment type
        if (file.type.startsWith('image/')) {
          attachmentType = 'image';
        } else if (file.type === 'application/pdf' || file.type.includes('document')) {
          attachmentType = 'document';
        } else {
          attachmentType = 'other';
        }
      }

      // Insert message
      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert({
          dossier_id: dossier.id,
          sender_user_id: session.user.id,
          sender_role: roleData?.role || 'family',
          channel: 'PORTAL' as any,
          message: newMessage.trim(),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
        });

      if (insertError) throw insertError;

      // Update last channel preference
      await supabase
        .from('dossier_communication_preferences')
        .upsert({
          dossier_id: dossier.id,
          last_channel_used: 'PORTAL' as any,
        }, {
          onConflict: 'dossier_id'
        });

      // Reset form
      setNewMessage("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast({
        title: "Bericht verzonden",
        description: "Uw bericht is succesvol verzonden",
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
    return date.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat</h1>
          <p className="text-muted-foreground mt-1">
            {dossier ? `Dossier ${dossier.display_id || dossier.ref_number}` : 'Geen dossier'}
          </p>
        </div>
        {dossier && (
          <Button
            variant="outline"
            onClick={() => {
              const message = encodeURIComponent(`Hallo, ik heb een vraag over dossier ${dossier.display_id || dossier.ref_number}`);
              window.open(`https://wa.me/YOUR_WHATSAPP_NUMBER?text=${message}`, '_blank');
            }}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp JanAssist
          </Button>
        )}
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
                  <p className="text-sm mt-2">Start een conversatie met de uitvaartondernemer</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg max-w-[80%]",
                      msg.sender_role === 'family'
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs opacity-80">
                      <span className="font-medium">{getRoleName(msg.sender_role)}</span>
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
                      </a>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Box */}
            <div className="border-t pt-4 space-y-3">
              {file && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <Paperclip className="h-4 w-4" />
                  <span className="flex-1">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Typ uw bericht..."
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
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
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
                  disabled={sending || (!newMessage.trim() && !file)}
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
                💡 Deel geen rijksregisternummer of medische informatie in de chat
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                📎 Bijlagen worden opgeslagen als chat-bijlage (niet als officieel document)
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
