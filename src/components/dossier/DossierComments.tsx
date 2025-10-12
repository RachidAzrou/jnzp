import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Edit2, Trash2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface DossierCommentsProps {
  dossierId: string;
  organizationId: string;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  author_id: string;
  is_hidden: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  mentions?: { user_id: string }[];
}

interface OrgUser {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export function DossierComments({ dossierId, organizationId }: DossierCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
    fetchOrgUsers();
    getCurrentUser();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel(`dossier-comments-${dossierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dossier_comments',
          filter: `dossier_id=eq.${dossierId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossierId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchOrgUsers = async () => {
    if (!organizationId) return;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles:user_id (
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', organizationId);

    if (!error && data) {
      const users = data.map((ur: any) => ({
        user_id: ur.user_id,
        first_name: ur.profiles?.first_name,
        last_name: ur.profiles?.last_name,
        email: ur.profiles?.email
      }));
      setOrgUsers(users);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_comments' as any)
        .select(`
          *,
          profiles:author_id (
            first_name,
            last_name,
            email
          ),
          dossier_comment_mentions (
            user_id
          )
        `)
        .eq('dossier_id', dossierId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComments(data as any);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleTextChange = (text: string, cursorPos: number) => {
    setNewComment(text);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger
    const textBeforeCursor = text.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionFilter(mentionMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionFilter("");
    }
  };

  const insertMention = (user: OrgUser) => {
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    
    // Remove the @ and partial name
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    const newText = `${beforeMention}@${userName} ${textAfterCursor}`;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionFilter("");
    
    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create comment directly and let the database function handle mentions
      const { error } = await supabase
        .from('dossier_comments' as any)
        .insert({
          dossier_id: dossierId,
          org_id: organizationId,
          author_id: user.id,
          body: newComment
        });

      if (error) throw error;

      setNewComment("");
      toast({
        title: "Opmerking geplaatst",
        description: "Uw opmerking is succesvol toegevoegd."
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('dossier_comments' as any)
        .update({
          body: editText,
          updated_at: new Date().toISOString(),
          edited_by: user?.id
        })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditText("");
      toast({
        title: "Opmerking bijgewerkt",
        description: "Uw wijzigingen zijn opgeslagen."
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Weet u zeker dat u deze opmerking wilt verbergen?")) return;

    try {
      const { error } = await supabase
        .from('dossier_comments' as any)
        .update({ is_hidden: true, hidden_reason: 'Verwijderd door auteur' })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Opmerking verwijderd",
        description: "De opmerking is verborgen."
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getInitials = (comment: Comment) => {
    if (comment.profiles?.first_name && comment.profiles?.last_name) {
      return `${comment.profiles.first_name[0]}${comment.profiles.last_name[0]}`.toUpperCase();
    }
    return comment.profiles?.email?.[0]?.toUpperCase() || '?';
  };

  const getAuthorName = (comment: Comment) => {
    if (comment.profiles?.first_name || comment.profiles?.last_name) {
      return `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim();
    }
    return comment.profiles?.email || 'Onbekend';
  };

  const filteredUsers = orgUsers.filter(user => {
    if (!mentionFilter) return true;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = user.email.toLowerCase();
    return name.includes(mentionFilter) || email.includes(mentionFilter);
  });

  return (
    <div className="space-y-6">
      {/* New comment form */}
      <div className="space-y-3 relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart)}
          placeholder="Voeg een opmerking toe... Gebruik @ om collega's te taggen"
          rows={3}
          disabled={isSubmitting}
          className="resize-none"
        />
        
        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.user_id}
                className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-2 first:rounded-t-lg last:rounded-b-lg"
                onClick={() => insertMention(user)}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            Tip: Gebruik @ om collega's te taggen
          </p>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !newComment.trim()}
            size="sm"
            className="h-8"
          >
            <Send className="h-3.5 w-3.5 mr-2" />
            Plaatsen
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-0 border rounded-lg overflow-hidden bg-card">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 mx-auto">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">Nog geen opmerkingen</p>
            <p className="text-xs text-muted-foreground">Start de discussie!</p>
          </div>
        ) : (
          comments.map((comment, index) => (
            <div 
              key={comment.id} 
              className={cn(
                "flex gap-3 p-4 hover:bg-muted/50 transition-colors",
                index !== comments.length - 1 && "border-b"
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(comment)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{getAuthorName(comment)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { 
                        addSuffix: true,
                        locale: nl 
                      })}
                    </span>
                    {comment.updated_at && (
                      <Badge variant="outline" className="text-xs h-5">
                        Bewerkt
                      </Badge>
                    )}
                  </div>
                  {currentUserId === comment.author_id && editingId !== comment.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditText(comment.body);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleEdit(comment.id)}
                      >
                        Opslaan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                    {comment.body}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
