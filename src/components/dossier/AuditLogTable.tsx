import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";

interface AuditLogTableProps {
  dossierId: string;
}

export function AuditLogTable({ dossierId }: AuditLogTableProps) {
  const { roles } = useUserRole();
  const isPlatformAdmin = roles.includes("platform_admin");

  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ["audit-events", dossierId],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("audit_events")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user details for each event
      const eventsWithUsers = await Promise.all(
        (events || []).map(async (event) => {
          if (!event.user_id) return { ...event, user: null };
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", event.user_id)
            .single();
          
          return { ...event, user: profile };
        })
      );

      return eventsWithUsers;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Auditlog</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!auditEvents || auditEvents.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Auditlog</h2>
        <p className="text-sm text-muted-foreground">Geen audit events gevonden voor dit dossier.</p>
      </div>
    );
  }

  const getActionBadgeVariant = (eventType: string) => {
    if (eventType.includes("DELETE") || eventType.includes("REMOVE")) return "destructive";
    if (eventType.includes("CREATE") || eventType.includes("INSERT")) return "default";
    if (eventType.includes("UPDATE") || eventType.includes("CHANGE")) return "secondary";
    return "outline";
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "platform_admin":
      case "admin":
        return "destructive";
      case "funeral_director":
        return "default";
      case "insurer":
        return "secondary";
      case "mortuarium":
      case "mosque":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      platform_admin: "Platform Admin",
      admin: "Admin",
      funeral_director: "Uitvaartleider",
      insurer: "Verzekeraar",
      mortuarium: "Mortuarium",
      mosque: "Moskee",
      org_admin: "Org Admin",
      family: "Familie",
    };
    return roleMap[role] || role;
  };

  const formatActionName = (eventType: string) => {
    const actionMap: Record<string, string> = {
      STATUS_CHANGED: "Status gewijzigd",
      DOCUMENT_UPLOADED: "Document geüpload",
      DOCUMENT_APPROVED: "Document goedgekeurd",
      DOCUMENT_REJECTED: "Document afgekeurd",
      DOSSIER_CREATED: "Dossier aangemaakt",
      DOSSIER_UPDATED: "Dossier bijgewerkt",
      DOSSIER_DELETED: "Dossier verwijderd",
      FD_RELEASE: "FD vrijgegeven",
      FAMILY_RELEASE: "Familie vrijgegeven FD",
      CLAIM_APPROVED: "Claim goedgekeurd",
      CLAIM_REJECTED: "Claim afgewezen",
      USER_CREATED: "Gebruiker aangemaakt",
      USER_UPDATED: "Gebruiker bijgewerkt",
      PASSWORD_CHANGED: "Wachtwoord gewijzigd",
      HOLD_SET: "Blokkering ingesteld",
      HOLD_LIFTED: "Blokkering opgeheven",
    };
    return actionMap[eventType] || eventType.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Auditlog</h2>
        {isPlatformAdmin && (
          <Badge variant="outline">Platform Admin - Alle organisaties zichtbaar</Badge>
        )}
      </div>

      <div className="relative w-full overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Tijd</TableHead>
              <TableHead>Gebruiker</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Wat</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm">
                  {format(new Date(event.created_at), "dd MMM HH:mm", { locale: nl })}
                </TableCell>
                <TableCell className="text-sm">
                  {event.user_id && event.user ? (
                    <div>
                      <div className="font-medium">{event.user.display_name || event.user.email}</div>
                      {event.user.display_name && (
                        <div className="text-xs text-muted-foreground">{event.user.email}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Systeem</span>
                  )}
                </TableCell>
                <TableCell>
                  {event.actor_role ? (
                    <Badge variant={getRoleBadgeVariant(event.actor_role)} className="text-xs">
                      {formatRoleName(event.actor_role)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {formatActionName(event.event_type)}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <p>{event.description}</p>
                    {event.reason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Reden:</span> {event.reason}
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
