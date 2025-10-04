import { Home, FolderOpen, CheckSquare, FileText, Calendar, Settings, Upload, LayoutDashboard, Receipt, MessageSquare, BarChart3, Building2, Users, Activity, UserPlus, Flag } from "lucide-react";
import { PiMosque } from "react-icons/pi";
import { CgSmartHomeRefrigerator } from "react-icons/cg";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole, UserRole, useRolePortalName } from "@/hooks/useUserRole";
import logoHorizontal from "@/assets/logo-horizontal.png";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type MenuItem = {
  titleKey: string;
  url: string;
  icon: any;
  roles: UserRole[];
};

export function AppSidebar() {
  const { role, loading } = useUserRole();
  const { t } = useTranslation();
  const rolePortalName = useRolePortalName(role);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems: MenuItem[] = [
    // Platform Admin - Deze items voor platform_admin EN admin
    { titleKey: "navigation.adminDashboard", url: "/admin", icon: LayoutDashboard, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.directory", url: "/admin/directory", icon: Building2, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.organizations", url: "/admin/organizations", icon: Building2, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.dossiers", url: "/admin/dossiers", icon: FolderOpen, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.documentReview", url: "/admin/documents", icon: FileText, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.integrations", url: "/admin/integrations", icon: Activity, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.invoicesTitle", url: "/admin/invoices", icon: Receipt, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.users", url: "/admin/users", icon: Users, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.config", url: "/admin/config", icon: Flag, roles: ['platform_admin', 'admin'] },
    { titleKey: "navigation.auditLog", url: "/admin/audit", icon: FileText, roles: ['platform_admin', 'admin'] },
    
    // Org Admin
    { titleKey: "navigation.teamManagement", url: "/team", icon: UserPlus, roles: ['org_admin', 'admin', 'platform_admin'] },
    
    // FD & Org Admin (niet voor platform_admin/admin - die hebben eigen menu)
    { titleKey: "navigation.dashboard", url: "/", icon: Home, roles: ['funeral_director', 'org_admin'] },
    { titleKey: "navigation.dossiers", url: "/dossiers", icon: FolderOpen, roles: ['funeral_director', 'org_admin'] },
    { titleKey: "navigation.tasks", url: "/taken", icon: CheckSquare, roles: ['funeral_director', 'org_admin'] },
    { titleKey: "navigation.documents", url: "/documenten", icon: FileText, roles: ['funeral_director', 'org_admin'] },
    { titleKey: "navigation.planning", url: "/planning", icon: Calendar, roles: ['funeral_director', 'org_admin'] },
    { titleKey: "navigation.facturatie", url: "/facturatie", icon: Receipt, roles: ['funeral_director', 'org_admin'] },
    
    // Insurer
    { titleKey: "navigation.dashboard", url: "/insurer", icon: LayoutDashboard, roles: ['insurer'] },
    { titleKey: "navigation.invoicesTitle", url: "/insurer/facturen", icon: Receipt, roles: ['insurer'] },
    { titleKey: "navigation.reporting", url: "/insurer/rapportage", icon: BarChart3, roles: ['insurer'] },
    
    // Mortuarium
    { titleKey: "navigation.dashboard", url: "/wasplaats", icon: LayoutDashboard, roles: ['wasplaats'] },
    { titleKey: "navigation.coolCells", url: "/wasplaats/koelcellen", icon: CgSmartHomeRefrigerator, roles: ['wasplaats'] },
    { titleKey: "navigation.facturatie", url: "/wasplaats/facturatie", icon: Receipt, roles: ['wasplaats'] },
    
    // Mosque
    { titleKey: "navigation.dashboard", url: "/moskee", icon: LayoutDashboard, roles: ['mosque'] },
    { titleKey: "navigation.requests", url: "/moskee/aanvragen", icon: FolderOpen, roles: ['mosque'] },
    { titleKey: "navigation.availability", url: "/moskee/beschikbaarheid", icon: PiMosque, roles: ['mosque'] },
    
    // Family
    { titleKey: "navigation.dashboard", url: "/familie", icon: LayoutDashboard, roles: ['family'] },
    { titleKey: "navigation.myDocuments", url: "/mijn-documenten", icon: Upload, roles: ['family'] },
    { titleKey: "navigation.chat", url: "/familie/chat", icon: MessageSquare, roles: ['family'] },
    
    // Settings for all
    { titleKey: "navigation.settings", url: "/instellingen", icon: Settings, roles: ['admin', 'funeral_director', 'family', 'insurer', 'wasplaats', 'mosque', 'platform_admin', 'org_admin', 'reviewer', 'support'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    role && item.roles.includes(role)
  );

  if (loading) {
    return (
      <Sidebar className="border-r">
        <SidebarContent>
          <div className="px-6 py-6 border-b border-sidebar-border">
            <img src={logoHorizontal} alt="JanazApp" className="h-8 brightness-0 invert" />
            <p className="text-xs text-sidebar-foreground/70 mt-2">{t("common.loading")}</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarContent>
        <div className="px-6 py-6 border-b border-sidebar-border">
          <img src={logoHorizontal} alt="JanazApp" className={`h-8 brightness-0 invert transition-all ${isCollapsed ? 'hidden' : ''}`} />
          {!isCollapsed && (
            <p className="text-xs text-sidebar-foreground/70 mt-2 font-medium">{rolePortalName}</p>
          )}
        </div>
        
        <SidebarGroup className="mt-6">
          {!isCollapsed && (
            <SidebarGroupLabel className="px-6 text-sidebar-foreground/60 text-xs uppercase tracking-wider font-semibold mb-2">
              Navigatie
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                          isActive
                            ? "bg-primary/10 backdrop-blur-xl border border-primary/20 text-white font-bold shadow-lg shadow-primary/10 mx-2 w-[calc(100%-1rem)]"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 mx-3"
                        } ${isCollapsed ? 'justify-center' : ''}`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span className="text-sm">{t(item.titleKey)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-background/50">
        {!isCollapsed && <LanguageSwitcher />}
      </SidebarFooter>
    </Sidebar>
  );
}
