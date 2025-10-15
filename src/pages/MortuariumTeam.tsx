import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function MortuariumTeam() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Get current user's organization
  const { data: userOrg } = useQuery({
    queryKey: ["userOrganization"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from("user_roles")
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      return data;
    },
  });

  // Fetch team members
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["teamMembers", userOrg?.organization_id],
    enabled: !!userOrg?.organization_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          is_admin,
          created_at,
          profiles(email, full_name)
        `)
        .eq("organization_id", userOrg?.organization_id)
        .eq("role", "mortuarium");

      return data;
    },
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!userOrg?.organization_id) throw new Error("No organization");
      
      const { error } = await (supabase.rpc as any)("send_team_invitation", {
        p_email: email,
        p_organization_id: userOrg.organization_id,
        p_role: "mortuarium",
        p_is_admin: isAdmin,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Uitnodiging verstuurd",
        description: "De teamuitnodiging is verzonden per e-mail.",
      });
      setEmail("");
      setIsAdmin(false);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij uitnodigen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", userOrg?.organization_id)
        .eq("role", "mortuarium");

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Teamlid verwijderd",
        description: "Het teamlid is succesvol verwijderd.",
      });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Organisatie</p>
                    <h1 className="text-2xl font-bold tracking-tight">Teambeheer</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
                  Beheer teamleden van {userOrg?.organizations?.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle>Teamlid uitnodigen</CardTitle>
          <CardDescription>
            Nodig een nieuw teamlid uit via e-mail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("placeholders.emailExample")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="isAdmin"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isAdmin" className="cursor-pointer">
                Administrator-rechten toekennen
              </Label>
            </div>

            <Button type="submit" disabled={inviteMutation.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              {inviteMutation.isPending ? "Uitnodigen..." : "Uitnodiging versturen"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teamleden</CardTitle>
          <CardDescription>Huidige teamleden van de organisatie</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : !teamMembers?.length ? (
            <p className="text-muted-foreground">Nog geen teamleden</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Toegevoegd</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.profiles?.full_name || "-"}
                    </TableCell>
                    <TableCell>{member.profiles?.email}</TableCell>
                    <TableCell>
                      {member.is_admin ? (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Administrator
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Medewerker</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Teamlid verwijderen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je {member.profiles?.email} wilt
                              verwijderen? Deze actie kan niet ongedaan worden
                              gemaakt.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMutation.mutate(member.user_id)}
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
