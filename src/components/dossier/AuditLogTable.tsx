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
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
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
      case "wasplaats":
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
      wasplaats: "Wasplaats",
      mosque: "Moskee",
      org_admin: "Org Admin",
      family: "Familie",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Auditlog</h2>
        {isPlatformAdmin && (
          <Badge variant="outline">Platform Admin - Alle organisaties zichtbaar</Badge>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Tijd</TableHead>
              <TableHead>Gebruiker</TableHead>
              <TableHead>Rol</TableHead>
              {isPlatformAdmin && <TableHead>Organisatie</TableHead>}
              <TableHead>Actie</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(event.created_at), "dd MMM yyyy HH:mm", { locale: nl })}
                </TableCell>
                <TableCell>
                  {event.user_id ? (
                    <span className="text-sm font-mono">{event.user_id.slice(0, 8)}...</span>
                  ) : (
                    <span className="text-muted-foreground">Systeem</span>
                  )}
                </TableCell>
                <TableCell>
                  {event.actor_role && (
                    <Badge variant={getRoleBadgeVariant(event.actor_role)}>
                      {formatRoleName(event.actor_role)}
                    </Badge>
                  )}
                </TableCell>
                {isPlatformAdmin && (
                  <TableCell>
                    {event.organization_id ? (
                      <span className="text-sm font-mono">{event.organization_id.slice(0, 8)}...</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={getActionBadgeVariant(event.event_type)}>
                    {event.event_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm">{event.description}</p>
                    {event.reason && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Reden:</span> {event.reason}
                      </p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Metadata
                        </summary>
                        <pre className="mt-1 overflow-auto rounded bg-muted p-2">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
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
