import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Paperclip, Download, X, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [canDelete, setCanDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        
        // Check if chat can be deleted (only if dossier is archived)
        setCanDelete(transformedDossier.status === 'ARCHIVED');
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

  const handleDeleteChat = async () => {
    if (!dossier || !canDelete) return;

    try {
      setIsDeleting(true);

      // Delete all messages for this dossier
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('dossier_id', dossier.id);

      if (error) throw error;

      toast({
        title: "Chat verwijderd",
        description: "Alle chatberichten zijn verwijderd",
      });

      navigate('/fd/chat');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Fout",
        description: "Chat kon niet worden verwijderd",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate('/fd/chat')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chat</h1>
            <p className="text-sm text-muted-foreground">
              Dossier {dossier?.display_id || dossier?.ref_number} — {dossier?.deceased_name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {dossier && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dossiers/${dossier.id}`)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Dossier
            </Button>
          )}
          
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Verwijder Chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Chat verwijderen?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet je zeker dat je alle chatberichten voor dit dossier wilt verwijderen?
                    Deze actie kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteChat}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting ? "Bezig met verwijderen..." : "Ja, verwijder chat"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Chat Thread */}
        <Card className="flex flex-col shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                Conversatie
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {messages.length} {messages.length === 1 ? 'bericht' : 'berichten'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-muted/20 to-background" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nog geen berichten</p>
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
                          "flex flex-col gap-1 p-4 rounded-lg max-w-[80%] shadow-sm",
                          msg.sender_role === 'funeral_director'
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs opacity-80 mb-1">
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
            <div className="border-t bg-background p-6 space-y-3">
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
                  placeholder="Typ uw bericht..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[80px] resize-none"
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

        {/* Dossier Info Sidebar */}
        {dossier && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-base">Dossier Informatie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Overledene</p>
                  <p className="font-medium">{dossier.deceased_name || 'Nog in te vullen'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dossier-ID</p>
                  <p className="font-medium font-mono text-sm">{dossier.display_id || dossier.ref_number}</p>
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

            {/* Quick Actions Card */}
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-base">Snelle Acties</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/dossiers/${dossier.id}`)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Bekijk volledig dossier
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate(`/dossiers/${dossier.id}?tab=documents`)}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Documenten beheren
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
