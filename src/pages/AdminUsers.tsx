import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Ban, CheckCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoleDisplayName } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: string;
  organization_id: string | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user_roles with profile data
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          organization_id,
          created_at,
          profiles!inner(
            email,
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map to UserWithRole format and deduplicate users (some have multiple roles)
      const usersMap = new Map<string, UserWithRole>();
      
      (userRoles || []).forEach((ur: any) => {
        const userId = ur.user_id;
        
        // If user already exists, keep the first role we encountered
        if (!usersMap.has(userId)) {
          usersMap.set(userId, {
            id: userId,
            email: ur.profiles?.email || "",
            created_at: ur.created_at,
            role: ur.role,
            organization_id: ur.organization_id,
          });
        }
      });

      setUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon gebruikers niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Call edge function to delete user
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userToDelete.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Gebruiker verwijderd",
        description: `${userToDelete.email} is succesvol verwijderd`,
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Fout",
        description: error.message || "Kon gebruiker niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      'platform_admin': 'Platform Admin',
      'admin': 'Admin',
      'org_admin': 'Organisatie Admin',
      'funeral_director': 'Uitvaartondernemer',
      'wasplaats': 'Mortuarium',
      'mosque': 'Moskee',
      'insurer': 'Verzekeraar',
      'family': 'Familie'
    };
    const roleLabel = roleLabels[role] || role;
    return <Badge variant="outline" className="text-xs">{roleLabel}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Users className="h-6 w-6" />
          {t("admin.users.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beheer gebruikersaccounts en rollen
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.users.searchLabel")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("placeholders.searchEmail")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.users.usersCount")} ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">Email</TableHead>
                <TableHead className="font-medium text-sm">Rol</TableHead>
                <TableHead className="font-medium text-sm">Aangemaakt</TableHead>
                <TableHead className="font-medium text-sm">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-sm">{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("nl-NL")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUserToDelete(user);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={user.id === currentUserId}
                      className="text-destructive hover:text-destructive disabled:opacity-50"
                      title={user.id === currentUserId ? "Je kunt je eigen account niet verwijderen" : ""}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Verwijderen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je <strong>{userToDelete?.email}</strong> wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
