import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface DossierNotesProps {
  dossierId: string;
  organizationId: string;
}

export function DossierNotes({ dossierId, organizationId }: DossierNotesProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [dossierId]);

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
          )
        `)
        .eq('dossier_id', dossierId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dossier_comments' as any)
        .insert({
          dossier_id: dossierId,
          organization_id: organizationId,
          author_id: user.id,
          body: newComment
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({
        title: "Opmerking toegevoegd",
        description: "Uw opmerking is succesvol geplaatst."
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

  const getInitials = (comment: any) => {
    if (comment.profiles?.first_name && comment.profiles?.last_name) {
      return `${comment.profiles.first_name[0]}${comment.profiles.last_name[0]}`.toUpperCase();
    }
    return comment.profiles?.email?.[0]?.toUpperCase() || '?';
  };

  const getAuthorName = (comment: any) => {
    if (comment.profiles?.first_name || comment.profiles?.last_name) {
      return `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim();
    }
    return comment.profiles?.email || 'Onbekend';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Interne Opmerkingen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New comment form */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Voeg een interne opmerking toe..."
            rows={3}
            disabled={isSubmitting}
          />
          
          <div className="flex justify-end">
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

        {/* Comments list */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nog geen opmerkingen
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(comment)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getAuthorName(comment)}</span>
                      <span className="text-sm text-muted-foreground">
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
                    
                    <p className="text-sm whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}