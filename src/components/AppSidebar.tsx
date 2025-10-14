import { Home, FolderOpen, CheckSquare, FileText, Calendar, Settings, Upload, LayoutDashboard, Receipt, MessageSquare, BarChart3, Building2, Users, Activity, Flag, Monitor, Bell, Webhook, TrendingUp, Search, Shield, Archive } from "lucide-react";
import { PiMosque } from "react-icons/pi";
import { CgSmartHomeRefrigerator } from "react-icons/cg";
import { NavLink, useLocation } from "react-router-dom";
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

type MenuItem = {
  titleKey: string;
  url: string;
  icon: any;
  roles: UserRole[];
  requireAdmin?: boolean;
};

export function AppSidebar() {
  const { role, roles, organizationType, loading, isOrgAdmin, hasRole } = useUserRole();
  const { t } = useTranslation();
  const defaultRolePortalName = useRolePortalName(role);
  const { state } = useSidebar();
  
  // Determine portal name based on organization type for org_admin
  const rolePortalName = (() => {
    if (isOrgAdmin && organizationType) {
      switch (organizationType) {
        case 'MOSQUE':
          return t('rolePortals.mosque');
        case 'FUNERAL_DIRECTOR':
          return t('rolePortals.funeral_director');
        case 'MORTUARIUM':
          return t('rolePortals.mortuarium');
        case 'INSURER':
          return t('rolePortals.insurer');
      }
    }
    return defaultRolePortalName;
  })();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const menuItems: MenuItem[] = [
    // Platform Admin
    { titleKey: "navigation.adminDashboard", url: "/admin", icon: LayoutDashboard, roles: ['platform_admin'] },
    { titleKey: "navigation.directory", url: "/admin/directory", icon: Building2, roles: ['platform_admin'] },
    { titleKey: "navigation.users", url: "/admin/users", icon: Users, roles: ['platform_admin'] },
    { titleKey: "navigation.dossiers", url: "/admin/dossiers", icon: FolderOpen, roles: ['platform_admin'] },
    { titleKey: "navigation.documentReview", url: "/admin/documents", icon: FileText, roles: ['platform_admin'] },
    { titleKey: "navigation.invoicesTitle", url: "/admin/invoices", icon: Receipt, roles: ['platform_admin'] },
    { titleKey: "navigation.integrations", url: "/admin/integrations", icon: Activity, roles: ['platform_admin'] },
    { titleKey: "navigation.notifications", url: "/admin/notifications", icon: Bell, roles: ['platform_admin'] },
    { titleKey: "navigation.webhooks", url: "/admin/webhooks", icon: Webhook, roles: ['platform_admin'] },
    { titleKey: "navigation.config", url: "/admin/config", icon: Flag, roles: ['platform_admin'] },
    { titleKey: "navigation.auditLog", url: "/admin/audit", icon: FileText, roles: ['platform_admin'] },
    { titleKey: "navigation.reports", url: "/admin/reports", icon: TrendingUp, roles: ['platform_admin'] },
    
    // FD items
    { titleKey: "navigation.dashboard", url: "/", icon: Home, roles: ['funeral_director'] },
    { titleKey: "navigation.dossiers", url: "/dossiers", icon: FolderOpen, roles: ['funeral_director'] },
    { titleKey: "navigation.archiveLink", url: "/archief", icon: Archive, roles: ['funeral_director'] },
    { titleKey: "navigation.chat", url: "/fd/chat", icon: MessageSquare, roles: ['funeral_director'] },
    { titleKey: "navigation.tasks", url: "/taken", icon: CheckSquare, roles: ['funeral_director'] },
    { titleKey: "navigation.documents", url: "/documenten", icon: FileText, roles: ['funeral_director'] },
    { titleKey: "navigation.planning", url: "/planning", icon: Calendar, roles: ['funeral_director'] },
    { titleKey: "navigation.facturatie", url: "/facturatie", icon: Receipt, roles: ['funeral_director'] },
    
    
    // Insurer
    { titleKey: "navigation.dashboard", url: "/insurer", icon: LayoutDashboard, roles: ['insurer'] },
    { titleKey: "navigation.claims", url: "/insurer/claims", icon: Shield, roles: ['insurer'] },
    { titleKey: "navigation.dossiers", url: "/insurer/dossiers", icon: FolderOpen, roles: ['insurer'] },
    { titleKey: "navigation.chat", url: "/insurer/chat", icon: MessageSquare, roles: ['insurer'] },
    { titleKey: "navigation.invoicesTitle", url: "/insurer/facturen", icon: Receipt, roles: ['insurer'] },
    { titleKey: "navigation.reporting", url: "/insurer/rapportage", icon: BarChart3, roles: ['insurer'] },
    
    // Mosque
    { titleKey: "navigation.dashboard", url: "/moskee", icon: LayoutDashboard, roles: ['mosque'] },
    { titleKey: "navigation.availability", url: "/moskee/beschikbaarheid", icon: Calendar, roles: ['mosque'] },
    { titleKey: "navigation.planning", url: "/moskee/planning", icon: FolderOpen, roles: ['mosque'] },
    { titleKey: "navigation.publicScreen", url: "/moskee/publiek", icon: Monitor, roles: ['mosque'] },
    { titleKey: "navigation.teamManagement", url: "/moskee/team", icon: Users, roles: ['mosque'], requireAdmin: true },
    { titleKey: "navigation.settings", url: "/moskee/instellingen", icon: Settings, roles: ['mosque'] },
    
    // Mortuarium
    { titleKey: "navigation.dashboard", url: "/mortuarium", icon: LayoutDashboard, roles: ['mortuarium'] },
    { titleKey: "navigation.coolCells", url: "/mortuarium/koelcellen", icon: CgSmartHomeRefrigerator, roles: ['mortuarium'] },
    { titleKey: "navigation.adHocIntake", url: "/mortuarium/ad-hoc", icon: Upload, roles: ['mortuarium'] },
    { titleKey: "navigation.invoicing", url: "/mortuarium/facturatie", icon: Receipt, roles: ['mortuarium'] },
    { titleKey: "navigation.team", url: "/mortuarium/team", icon: Users, roles: ['mortuarium'] },
    { titleKey: "navigation.settings", url: "/mortuarium/instellingen", icon: Settings, roles: ['mortuarium'] },
    
    // Teambeheer - voor admins van niet-wasplaats en niet-mosque orgs
    { titleKey: "navigation.teamManagement", url: "/team", icon: Users, roles: ['funeral_director', 'insurer'], requireAdmin: true },
    
    // Settings voor andere roles (wasplaats en mosque hebben eigen settings)
    { titleKey: "navigation.settings", url: "/instellingen", icon: Settings, roles: ['funeral_director', 'insurer'] },
  ];

  // RBAC: Filter menu items based on ALL user roles and organization type
  const filteredMenuItems = menuItems.filter(item => {
    if (roles.length === 0) return false;
    
    // Platform admin: only see platform admin items
    if (hasRole('platform_admin')) {
      return item.roles.includes('platform_admin');
    }
    
    // Check if user has ANY of the required roles for this menu item
    const hasRequiredRole = item.roles.some(requiredRole => roles.includes(requiredRole));
    
    // If item requires admin rights but user is not admin, skip it
    if ((item as any).requireAdmin && !isOrgAdmin) {
      return false;
    }
    
    // Admin special handling: zie alle items van hun org type + teambeheer
    if (isOrgAdmin && organizationType) {
      // Ook alle items van hun org type tonen
      if (item.roles.includes('funeral_director') && organizationType === 'FUNERAL_DIRECTOR') {
        return true;
      }
      if (item.roles.includes('mortuarium') && organizationType === 'MORTUARIUM') {
        return true;
      }
      if (item.roles.includes('mosque') && organizationType === 'MOSQUE') {
        return true;
      }
      if (item.roles.includes('insurer') && organizationType === 'INSURER') {
        return true;
      }
    }
    
    // Voor normale medewerkers: filter op org type
    if (hasRequiredRole && organizationType) {
      // FD items alleen voor FUNERAL_DIRECTOR orgs
      if (item.roles.includes('funeral_director') && organizationType !== 'FUNERAL_DIRECTOR') {
        return false;
      }
      // Mosque items alleen voor MOSQUE orgs
      // Mortuarium items alleen voor MORTUARIUM orgs
      if (item.roles.includes('mortuarium') && organizationType !== 'MORTUARIUM') {
        return false;
      }
      if (item.roles.includes('mosque') && organizationType !== 'MOSQUE') {
        return false;
      }
      // Mortuarium items alleen voor MORTUARIUM orgs
      if (item.roles.includes('mortuarium') && organizationType !== 'MORTUARIUM') {
        return false;
      }
      // Insurer items alleen voor INSURER orgs
      if (item.roles.includes('insurer') && organizationType !== 'INSURER') {
        return false;
      }
    }
    
    return hasRequiredRole;
  }).filter((item, index, self) => 
    // Dedupe: verwijder duplicaat URLs (bijv. meerdere teambeheer items)
    index === self.findIndex((t) => t.url === item.url)
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
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarContent>
        <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center">
          <img src={logoHorizontal} alt="JanazApp" className={`h-10 sm:h-12 brightness-0 invert transition-all ${isCollapsed ? 'hidden' : ''}`} />
          {!isCollapsed && (
            <p className="text-xs text-sidebar-foreground/70 mt-2 font-medium text-center">{rolePortalName}</p>
          )}
        </div>
        
        <SidebarGroup className="mt-4 sm:mt-6">
          {!isCollapsed && (
            <SidebarGroupLabel className="px-4 sm:px-6 text-sidebar-foreground/60 text-xs uppercase tracking-wider font-semibold mb-2">
              {t("navigation.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredMenuItems.map((item) => {
                const isActive = item.url === "/" 
                  ? location.pathname === "/" 
                  : location.pathname.startsWith(item.url);
                
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-2.5 rounded-xl transition-all duration-300 mx-2 min-h-[44px] active:scale-95 ${
                          isActive
                            ? "bg-white/10 backdrop-blur-xl text-white font-bold shadow-lg shadow-primary/20"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-transparent active:bg-white/5"
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      >
                        <item.icon className="h-5 w-5 sm:h-5 sm:w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm sm:text-sm">{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
