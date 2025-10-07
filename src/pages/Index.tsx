import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";

const Index = () => {
  const navigate = useNavigate();
  const { roles, organizationType, loading } = useUserRole();
  const { t } = useTranslation();
  const [orgStatus, setOrgStatus] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Force logout if user has no roles (e.g. after cleanup)
      if (session && !loading && roles.length === 0) {
        await supabase.auth.signOut();
        navigate("/auth");
        return;
      }
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check organization status for professional roles
      if (session.user && !loading && roles.length > 0) {
        const professionalRoles = ['funeral_director', 'org_admin', 'wasplaats', 'mosque', 'insurer'];
        const hasProfessionalRole = roles.some(r => professionalRoles.includes(r));
        
        if (hasProfessionalRole) {
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
            await supabase.auth.signOut();
            navigate("/auth");
            return;
          }
        }
      }

      if (!loading && organizationType) {
        // Redirect based on organization type
        if (organizationType === 'WASPLAATS') {
          navigate("/wasplaats");
        } else if (organizationType === 'MOSQUE') {
          navigate("/moskee");
        } else if (organizationType === 'INSURER') {
          navigate("/insurer");
        } else if (organizationType === 'FUNERAL_DIRECTOR') {
          navigate("/dashboard");
        }
      } else if (!loading && roles.includes('platform_admin')) {
        navigate("/admin");
      } else if (!loading && roles.includes('family')) {
        navigate("/familie");
      } else if (!loading && roles.length > 0) {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate, roles, organizationType, loading]);

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
