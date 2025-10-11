import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized audit logging utility
 * Ensures consistent audit trails across the application
 */
export const createAuditLog = async ({
  eventType,
  targetType,
  targetId,
  dossierId,
  description,
  reason,
  metadata = {},
}: {
  eventType: string;
  targetType: string;
  targetId: string;
  dossierId?: string;
  description: string;
  reason?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user role and organization
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, organization_id")
      .eq("user_id", user?.id)
      .single();

    const auditEntry = {
      user_id: user?.id,
      actor_role: userRole?.role,
      organization_id: userRole?.organization_id,
      event_type: eventType,
      target_type: targetType,
      target_id: targetId,
      dossier_id: dossierId,
      description: description,
      reason: reason,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
    };

    const { error } = await supabase
      .from("audit_events")
      .insert(auditEntry);

    if (error) {
      console.error("Audit log failed:", error);
      // Don't throw - audit logging shouldn't block main operations
    }

    return true;
  } catch (error) {
    console.error("Audit log error:", error);
    return false;
  }
};

/**
 * Helper function for dossier-specific audit logs
 */
export const logDossierEvent = async ({
  dossierId,
  eventType,
  description,
  metadata = {},
}: {
  dossierId: string;
  eventType: string;
  description: string;
  metadata?: Record<string, any>;
}) => {
  return createAuditLog({
    eventType,
    targetType: "Dossier",
    targetId: dossierId,
    dossierId,
    description,
    metadata,
  });
};

/**
 * Helper function for task-specific audit logs
 */
export const logTaskEvent = async ({
  taskId,
  dossierId,
  eventType,
  description,
  metadata = {},
}: {
  taskId: string;
  dossierId?: string;
  eventType: string;
  description: string;
  metadata?: Record<string, any>;
}) => {
  return createAuditLog({
    eventType,
    targetType: "Task",
    targetId: taskId,
    dossierId,
    description,
    metadata,
  });
};
