import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { UserPlus, Trash2, Users } from "lucide-react";

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    display_name: string | null;
  };
};

export default function MoskeeTeam() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Fetch user's mosque org
  const { data: userOrgs } = useQuery({
    queryKey: ["user-mosque-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mosque")
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch team members
  const { data: members, isLoading } = useQuery({
    queryKey: ["mosque-team", userOrgs?.organization_id],
    enabled: !!userOrgs?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          *,
          profiles (display_name)
        `)
        .eq("organization_id", userOrgs!.organization_id)
        .eq("role", "mosque");

      if (error) throw error;
      return data as any as TeamMember[];
    },
  });

  // Invite mutation (simplified - in production would use edge function)
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      // In production: call edge function to send invitation
      toast({ title: t("toast.mosque.invite_functionality"), description: t("toast.mosque.invite_not_available") });
    },
    onSuccess: () => {
      setInviteDialogOpen(false);
      setInviteEmail("");
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({ title: t("toast.error.email_required"), variant: "destructive" });
      return;
    }
    inviteMutation.mutate(inviteEmail);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Moskee</p>
                <h1 className="text-2xl font-bold tracking-tight">Teambeheer</h1>
              </div>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Lid Uitnodigen
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teamlid uitnodigen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">E-mailadres</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="naam@voorbeeld.nl"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleInvite}>Uitnodiging Versturen</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </div>
          <p className="text-sm text-muted-foreground mt-3 pl-15">Beheer teamleden en toegangsrechten</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teamleden ({members?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Laden...</div>
          ) : !members?.length ? (
            <div className="text-center py-8 text-muted-foreground">Geen teamleden gevonden</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center border rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium">
                      {member.profiles?.display_name || "Geen naam"}
                    </p>
                    <p className="text-sm text-muted-foreground">Moskee medewerker</p>
                  </div>
                  <Button variant="ghost" size="icon" disabled>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
