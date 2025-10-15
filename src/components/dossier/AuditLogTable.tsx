import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";

interface AuditLogTableProps {
  dossierId: string;
}

export function AuditLogTable({ dossierId }: AuditLogTableProps) {
  const { t } = useTranslation();
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
            .select("first_name, last_name, email")
            .eq("id", event.user_id)
            .maybeSingle();
          
          return { 
            ...event, 
            user: profile ? {
              name: `${profile.first_name} ${profile.last_name}`.trim(),
              email: profile.email
            } : null
          };
        })
      );

      return eventsWithUsers;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t("auditLog.title")}</h2>
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
        <h2 className="text-xl font-semibold">{t("auditLog.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auditLog.noEvents")}</p>
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
      platform_admin: t("auditLog.rolePlatformAdmin"),
      admin: t("auditLog.roleAdmin"),
      funeral_director: t("auditLog.roleFuneralDirector"),
      insurer: t("auditLog.roleInsurer"),
      mortuarium: t("auditLog.roleMortuarium"),
      mosque: t("auditLog.roleMosque"),
      org_admin: t("auditLog.roleOrgAdmin"),
      family: t("auditLog.roleFamily"),
    };
    return roleMap[role] || role;
  };

  const formatActionName = (eventType: string) => {
    const actionMap: Record<string, string> = {
      STATUS_CHANGED: t("auditLog.actions.statusChanged"),
      DOCUMENT_UPLOADED: t("auditLog.actions.documentUploaded"),
      DOCUMENT_APPROVED: t("auditLog.actions.documentApproved"),
      DOCUMENT_REJECTED: t("auditLog.actions.documentRejected"),
      DOSSIER_CREATED: t("auditLog.actions.dossierCreated"),
      DOSSIER_UPDATED: t("auditLog.actions.dossierUpdated"),
      DOSSIER_DELETED: t("auditLog.actions.dossierDeleted"),
      FD_RELEASE: t("auditLog.actions.fdRelease"),
      FAMILY_RELEASE: t("auditLog.actions.familyRelease"),
      CLAIM_APPROVED: t("auditLog.actions.claimApproved"),
      CLAIM_REJECTED: t("auditLog.actions.claimRejected"),
      USER_CREATED: t("auditLog.actions.userCreated"),
      USER_UPDATED: t("auditLog.actions.userUpdated"),
      PASSWORD_CHANGED: t("auditLog.actions.passwordChanged"),
      HOLD_SET: t("auditLog.actions.holdSet"),
      HOLD_LIFTED: t("auditLog.actions.holdLifted"),
    };
    return actionMap[eventType] || eventType.replace(/_/g, " ").toLowerCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("auditLog.title")}</h2>
        {isPlatformAdmin && (
          <Badge variant="outline">{t("auditLog.platformAdminBadge")}</Badge>
        )}
      </div>

      <div className="relative w-full overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">{t("auditLog.timestamp")}</TableHead>
              <TableHead>{t("auditLog.user")}</TableHead>
              <TableHead>{t("auditLog.role")}</TableHead>
              <TableHead>{t("auditLog.action")}</TableHead>
              <TableHead>{t("auditLog.details")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm">
                  {format(new Date(event.created_at), "dd MMM HH:mm", { locale: nl })}
                </TableCell>
                <TableCell className="text-sm">
                  {event.user_id ? (
                    event.user ? (
                      <div>
                        <div className="font-medium">{event.user.name}</div>
                        <div className="text-xs text-muted-foreground">{event.user.email}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{t("auditLog.userLabel")}</div>
                        <div className="text-xs text-muted-foreground">{event.user_id.slice(0, 8)}...</div>
                      </div>
                    )
                  ) : (
                    <span className="text-muted-foreground">{t("auditLog.system")}</span>
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
                        <span className="font-semibold">{t("auditLog.reason")}:</span> {event.reason}
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
