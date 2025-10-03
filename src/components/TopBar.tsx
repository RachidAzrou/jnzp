import { Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUserRole, getRoleDisplayName } from "@/hooks/useUserRole";

export function TopBar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState<string>("");
  const { role } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("navigation.logout"),
        description: t("common.success"),
      });
      navigate("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-3 sm:px-6 shadow-sm">
      <SidebarTrigger />
      
      <div className="flex-1 flex items-center gap-2 sm:gap-4">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("common.search")}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationPanel />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 rounded-md border px-2 sm:px-3 py-2 h-9 sm:h-10">
              <User className="h-4 w-4" />
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{userEmail || "Gebruiker"}</span>
                <span className="text-xs text-muted-foreground">{getRoleDisplayName(role)}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("navigation.settings")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/instellingen")}>
              {t("navigation.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("navigation.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
