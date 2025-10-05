import { Search, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { NotificationPanel } from "@/components/NotificationPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUserRole, useRoleDisplayName } from "@/hooks/useUserRole";

export function TopBar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState<string>("");
  const { role } = useUserRole();
  const roleDisplayName = useRoleDisplayName(role);

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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-6 shadow-sm">
      <SidebarTrigger className="h-9 w-9" />
      
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("common.search")}
            className="pl-10 h-10 bg-background/50 border-input/50 focus:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationPanel />
        <NotificationBell />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 rounded-lg border border-input/50 px-3 py-2 h-10 hover:bg-accent/50 hover:border-accent transition-all"
            >
              <User className="h-4 w-4" />
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">{userEmail || t("roles.user")}</span>
                <span className="text-xs text-muted-foreground mt-1">{roleDisplayName}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg">
            <DropdownMenuLabel className="font-medium">{t("navigation.settings")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate("/instellingen")}
              className="cursor-pointer focus:bg-accent/50"
            >
              <Settings className="mr-2 h-4 w-4" />
              {t("navigation.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleLogout} 
              className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("navigation.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
