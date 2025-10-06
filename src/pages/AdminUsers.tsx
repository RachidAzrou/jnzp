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
import { Users, Search, Ban, CheckCircle } from "lucide-react";
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
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionType, setActionType] = useState<"block" | "activate" | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          organization_id,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(userRoles?.map((ur) => ur.user_id) || [])];
      
      const usersData: UserWithRole[] = [];
      
      for (const userId of userIds) {
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        if (user) {
          const userRole = userRoles?.find((ur) => ur.user_id === userId);
          usersData.push({
            id: user.id,
            email: user.email || "",
            created_at: user.created_at,
            role: userRole?.role || "unknown",
            organization_id: userRole?.organization_id || null,
          });
        }
      }

      setUsers(usersData);
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

  const getRoleBadge = (role: string) => {
    const roleLabel = useRoleDisplayName(role as any);
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
