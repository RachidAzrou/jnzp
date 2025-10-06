import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, Edit2, Trash2 } from "lucide-react";
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
    <div className="space-y-4">
      {/* New comment form */}
      <div className="space-y-2 relative">
        <Textarea
          ref={textareaRef}
          value={newComment}
          onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart)}
          placeholder="Voeg een opmerking toe... Gebruik @ om collega's te taggen"
          rows={3}
          disabled={isSubmitting}
        />
        
        {/* Mention dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 5).map((user) => (
              <button
                key={user.user_id}
                className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                onClick={() => insertMention(user)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
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
          >
            <Send className="h-4 w-4 mr-2" />
            Plaatsen
          </Button>
        </div>
      </div>

      {/* Comments list - audit log style */}
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/30">
            Nog geen opmerkingen. Start de discussie!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{getInitials(comment)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{getAuthorName(comment)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { 
                        addSuffix: true,
                        locale: nl 
                      })}
                    </span>
                    {comment.updated_at && (
                      <Badge variant="outline" className="text-xs">
                        Bewerkt
                      </Badge>
                    )}
                  </div>
                  {currentUserId === comment.author_id && editingId !== comment.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditText(comment.body);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
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
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(comment.id)}
                      >
                        Opslaan
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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
                  <p className="text-sm whitespace-pre-wrap text-foreground">
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
