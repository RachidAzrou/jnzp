import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Copy, Check, UserX, UserCheck, Trash2, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  is_admin: boolean;
}

interface InvitationLink {
  id: string;
  email: string;
  invited_role: string;
  status: string;
  created_at: string;
  expires_at: string;
  token: string;
}

const TeamManagement = () => {
  const { t } = useTranslation();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationType, setOrganizationType] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteIsAdmin, setInviteIsAdmin] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrgAndData();
  }, []);

  const fetchOrgAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id, role, is_admin, organizations(name, type)")
        .eq("user_id", user.id)
        .eq("is_admin", true)
        .not("organization_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (!roleData?.organization_id) {
        toast({
          title: t("team.noOrganization"),
          description: t("team.noOrganizationDesc"),
          variant: "destructive",
        });
        return;
      }

      setOrganizationId(roleData.organization_id);
      setOrganizationType((roleData.organizations as any)?.type || null);
      
      await Promise.all([
        fetchTeamMembers(roleData.organization_id),
        fetchInvitations(roleData.organization_id),
      ]);
    } catch (error: any) {
      toast({
        title: t("team.errorLoading"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (orgId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        id,
        user_id,
        role,
        is_active,
        is_admin,
        profiles:user_id (
          email,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", orgId);

    if (error) throw error;

    const members = data?.map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      email: item.profiles?.email || "",
      first_name: item.profiles?.first_name || "",
      last_name: item.profiles?.last_name || "",
      role: item.role,
      is_active: item.is_active,
      is_admin: item.is_admin || false,
    })) || [];

    setTeamMembers(members);
  };

  const fetchInvitations = async (orgId: string) => {
    const { data, error } = await supabase
      .from("organization_invitations")
      .select("*")
      .eq("organization_id", orgId)
      .eq("status", "PENDING")
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;
    setInvitations(data || []);
  };

  const sendInvitation = async () => {
    if (!organizationId || !inviteEmail) {
      toast({
        title: t("team.incompleteData"),
        description: "Vul alle velden in",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("send-team-invitation", {
        body: { email: inviteEmail, isAdmin: inviteIsAdmin },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Uitnodiging verzonden",
        description: `Uitnodiging verzonden naar ${inviteEmail}`,
      });

      fetchInvitations(organizationId);
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteIsAdmin(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleMemberStatus = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_active: !currentStatus })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: !currentStatus ? "Geactiveerd" : "Gedeactiveerd",
        description: `Teamlid is ${!currentStatus ? "geactiveerd" : "gedeactiveerd"}`,
      });

      if (organizationId) fetchTeamMembers(organizationId);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Verwijderd",
        description: "Teamlid is verwijderd uit de organisatie",
      });

      if (organizationId) fetchTeamMembers(organizationId);
      setDeleteConfirm(null);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelInvitation = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("organization_invitations")
        .update({ status: "CANCELLED" })
        .eq("id", inviteId);

      if (error) throw error;

      toast({
        title: "Geannuleerd",
        description: "Uitnodiging is geannuleerd",
      });

      if (organizationId) fetchInvitations(organizationId);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(token);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Link gekopieerd",
      description: "Uitnodigingslink is gekopieerd",
    });
  };

  const getRoleBadge = (role: string, isAdmin: boolean) => {
    if (role === "funeral_director") return <Badge variant="outline">Uitvaartondernemer {isAdmin && "(Admin)"}</Badge>;
    if (role === "mosque") return <Badge variant="outline">Moskee {isAdmin && "(Admin)"}</Badge>;
    if (role === "wasplaats") return <Badge variant="outline">Wasplaats {isAdmin && "(Admin)"}</Badge>;
    if (role === "insurer") return <Badge variant="outline">Verzekeraar {isAdmin && "(Admin)"}</Badge>;
    return <Badge variant="outline">{role} {isAdmin && "(Admin)"}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
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
                  {t("team.subtitle")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-card/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">{t("team.members")}</CardTitle>
                <CardDescription className="text-sm">
                  {t("team.membersDescription")}
                </CardDescription>
              </div>
              <Button onClick={() => setShowInviteDialog(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("team.inviteMember")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{t("team.noMembers")}</p>
                <p className="text-xs mt-1">{t("team.inviteColleagues")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-sm">Naam</TableHead>
                    <TableHead className="font-medium text-sm">E-mail</TableHead>
                    <TableHead className="font-medium text-sm">Rol</TableHead>
                    <TableHead className="font-medium text-sm">Status</TableHead>
                    <TableHead className="font-medium text-sm">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell>{getRoleBadge(member.role, member.is_admin)}</TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "Actief" : "Gedeactiveerd"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleMemberStatus(member.id, member.is_active)}
                          >
                            {member.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteConfirm({
                                id: member.id,
                                name: `${member.first_name} ${member.last_name}`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md bg-card/50 backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">{t("team.activeInvitations")}</CardTitle>
            <CardDescription className="text-sm">
              {t("team.activeInvitationsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("team.noActiveInvitations")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-sm">E-mail</TableHead>
                    <TableHead className="font-medium text-sm">Rol</TableHead>
                    <TableHead className="font-medium text-sm">Uitgenodigd op</TableHead>
                    <TableHead className="font-medium text-sm">Verloopt op</TableHead>
                    <TableHead className="font-medium text-sm">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{invite.email}</TableCell>
                      <TableCell><Badge variant="outline">Teamlid</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString("nl-NL")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.expires_at).toLocaleDateString("nl-NL")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(invite.token)}
                          >
                            {copiedCode === invite.token ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => cancelInvitation(invite.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teamlid uitnodigen</DialogTitle>
            <DialogDescription>
              De uitgenodigde ontvangt een e-mail met activatielink (48u geldig).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("placeholders.emailExample")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={inviteIsAdmin}
                onChange={(e) => setInviteIsAdmin(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isAdmin" className="cursor-pointer">
                {t("team.adminRights")}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={sendInvitation} disabled={generating || !inviteEmail}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uitnodigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teamlid verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je {deleteConfirm?.name} wilt verwijderen uit deze organisatie?
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMember(deleteConfirm.id)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamManagement;
