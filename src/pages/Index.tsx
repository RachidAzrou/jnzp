import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const { t } = useTranslation();
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check organization status for professional roles
      if (session.user && !loading && role) {
        const professionalRoles = ['funeral_director', 'org_admin', 'wasplaats', 'mosque', 'insurer'];
        
        if (professionalRoles.includes(role)) {
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('organization_id')
            .eq('user_id', session.user.id)
            .not('organization_id', 'is', null)
            .maybeSingle();

          if (userRole?.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('verification_status, name, rejection_reason')
              .eq('id', userRole.organization_id)
              .single();

            if (org) {
              setOrgStatus(org.verification_status);
              setOrgName(org.name);
              setRejectionReason(org.rejection_reason || "");

              // Block access if not approved
              if (org.verification_status !== 'ACTIVE') {
                return;
              }
            }
          } else {
            // Professional user without organization - should not happen normally
            // But if it does, sign them out
            await supabase.auth.signOut();
            navigate("/auth");
            return;
          }
        }
      }

      if (!loading && role) {
        // Redirect based on role
        switch (role) {
          case "platform_admin":
            navigate("/admin");
            break;
          case "admin":
          case "org_admin":
          case "funeral_director":
            navigate("/dashboard");
            break;
          case "family":
            navigate("/familie");
            break;
          case "insurer":
            navigate("/insurer");
            break;
          case "wasplaats":
            navigate("/wasplaats");
            break;
          case "mosque":
            navigate("/moskee");
            break;
          case "reviewer":
          case "support":
            navigate("/admin");
            break;
          default:
            navigate("/auth");
        }
      }
    };

    checkAuth();
  }, [navigate, role, loading]);

  // Show pending approval screen if org not approved
  if (orgStatus && orgStatus !== 'ACTIVE') {
    return (
      <PendingApprovalScreen 
        status={orgStatus as "PENDING_VERIFICATION" | "REJECTED"}
        organizationName={orgName}
        rejectionReason={rejectionReason}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>
  );
};

export default Index;
