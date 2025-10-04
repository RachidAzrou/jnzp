import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Copy, Check } from "lucide-react";
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

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface InvitationLink {
  id: string;
  code: string;
  role: string;
  expires_at: string;
  max_uses: number;
  current_uses: number;
}

const TeamManagement = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<InvitationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("");
  const [maxUses, setMaxUses] = useState("1");
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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
        .select("organization_id, role")
        .eq("user_id", user.id)
        .single();

      if (!roleData?.organization_id) {
        toast({
          title: "Geen organisatie",
          description: "U bent niet gekoppeld aan een organisatie",
          variant: "destructive",
        });
        return;
      }

      setOrganizationId(roleData.organization_id);
      await Promise.all([
        fetchTeamMembers(roleData.organization_id),
        fetchInvitations(roleData.organization_id),
      ]);
    } catch (error: any) {
      toast({
        title: "Fout bij laden",
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
        user_id,
        role,
        profiles:user_id (
          email,
          first_name,
          last_name
        )
      `)
      .eq("organization_id", orgId);

    if (error) throw error;

    const members = data?.map((item: any) => ({
      id: item.user_id,
      email: item.profiles?.email || "",
      first_name: item.profiles?.first_name || "",
      last_name: item.profiles?.last_name || "",
      role: item.role,
    })) || [];

    setTeamMembers(members);
  };

  const fetchInvitations = async (orgId: string) => {
    const { data, error } = await supabase
      .from("invitation_links")
      .select("*")
      .eq("organization_id", orgId)
      .gt("expires_at", new Date().toISOString());

    if (error) throw error;
    setInvitations(data || []);
  };

  const generateInvite = async () => {
    if (!organizationId || !inviteRole) {
      toast({
        title: "Incomplete gegevens",
        description: "Selecteer een rol",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Generate invitation code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_invitation_code");
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from("invitation_links")
        .insert([{
          code: codeData,
          organization_id: organizationId,
          role: inviteRole as any,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          max_uses: parseInt(maxUses) || 1,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Uitnodiging aangemaakt",
        description: "Deel de uitnodigingslink met uw teamlid",
      });

      fetchInvitations(organizationId);
      setShowInviteDialog(false);
      setInviteRole("");
      setMaxUses("1");
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Link gekopieerd",
      description: "De uitnodigingslink is gekopieerd naar het klembord",
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === "org_admin") return <Badge>Org Admin</Badge>;
    return <Badge variant="outline">{role}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-medium">Teamleden</CardTitle>
              <CardDescription className="text-sm">Beheer uw teamleden en uitnodigingen</CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)} size="sm">
              <UserPlus className="mr-2 h-4 w-4" />
              Teamlid uitnodigen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">Naam</TableHead>
                <TableHead className="font-medium text-sm">Email</TableHead>
                <TableHead className="font-medium text-sm">Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm">
                    {member.first_name} {member.last_name}
                  </TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Actieve uitnodigingen</CardTitle>
          <CardDescription className="text-sm">Uitnodigingslinks die nog geldig zijn</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen actieve uitnodigingen
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium text-sm">Rol</TableHead>
                  <TableHead className="font-medium text-sm">Gebruikt</TableHead>
                  <TableHead className="font-medium text-sm">Verloopt op</TableHead>
                  <TableHead className="font-medium text-sm">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite) => (
                  <TableRow key={invite.id} className="hover:bg-muted/30">
                    <TableCell>{getRoleBadge(invite.role)}</TableCell>
                    <TableCell className="text-sm">
                      {invite.current_uses} / {invite.max_uses}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invite.expires_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInviteLink(invite.code)}
                      >
                        {copiedCode === invite.code ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teamlid uitnodigen</DialogTitle>
            <DialogDescription>
              Maak een uitnodigingslink aan voor een nieuw teamlid
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funeral_director">Uitvaartondernemer</SelectItem>
                  <SelectItem value="mosque">Moskee</SelectItem>
                  <SelectItem value="wasplaats">Wasplaats</SelectItem>
                  <SelectItem value="insurer">Verzekeraar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-uses">Maximaal aantal gebruik</Label>
              <Input
                id="max-uses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={generateInvite} disabled={generating || !inviteRole}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
