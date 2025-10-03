import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useTranslation } from "react-i18next";

const Index = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const { t } = useTranslation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
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
