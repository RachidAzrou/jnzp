import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";

const Index = () => {
  const navigate = useNavigate();
  const { roles, organizationType, loading } = useUserRole();
  const { t } = useTranslation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Wait for roles to load
      if (loading) {
        return;
      }

      // Force logout if user has no roles (should not happen)
      if (roles.length === 0) {
        console.log('[Index] No roles found, redirecting to auth');
        navigate("/auth");
        return;
      }

      // Redirect based on organization type or role
      if (organizationType === 'WASPLAATS') {
        console.log('[Index] Redirecting WASPLAATS to /wasplaats');
        navigate("/wasplaats");
      } else if (organizationType === 'MOSQUE') {
        console.log('[Index] Redirecting MOSQUE to /moskee');
        navigate("/moskee");
      } else if (organizationType === 'INSURER') {
        console.log('[Index] Redirecting INSURER to /insurer');
        navigate("/insurer");
      } else if (organizationType === 'FUNERAL_DIRECTOR') {
        console.log('[Index] Redirecting FD to /dashboard');
        navigate("/dashboard");
      } else if (roles.includes('platform_admin')) {
        console.log('[Index] Redirecting platform_admin to /admin');
        navigate("/admin");
      } else if (roles.includes('family')) {
        console.log('[Index] Redirecting family to /familie');
        navigate("/familie");
      }
    };

    checkAuth();
  }, [navigate, roles, organizationType, loading]);


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
