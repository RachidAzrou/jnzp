import { Home, FolderOpen, CheckSquare, FileText, Calendar, Settings, Upload, LayoutDashboard, Receipt, MessageSquare, BarChart3, Building2, Users, Activity, UserPlus } from "lucide-react";
import { PiMosque } from "react-icons/pi";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUserRole, UserRole, getRoleDisplayName } from "@/hooks/useUserRole";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logoHorizontal from "@/assets/logo-horizontal.png";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  // Platform Admin
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard, roles: ['platform_admin', 'org_admin', 'reviewer', 'support'] },
  { title: "Directory", url: "/admin/directory", icon: Building2, roles: ['platform_admin', 'org_admin'] },
  { title: "Organisaties", url: "/admin/organizations", icon: Building2, roles: ['platform_admin', 'admin'] },
  { title: "Gebruikers", url: "/admin/users", icon: Users, roles: ['platform_admin', 'org_admin'] },
  { title: "Integraties", url: "/admin/integrations", icon: Activity, roles: ['platform_admin'] },
  { title: "Audit Log", url: "/admin/audit", icon: FileText, roles: ['platform_admin', 'support'] },
  
  // Org Admin
  { title: "Team Beheer", url: "/team", icon: UserPlus, roles: ['org_admin', 'admin', 'platform_admin'] },
  
  // FD & Admin
  { title: "Dashboard", url: "/", icon: Home, roles: ['admin', 'funeral_director'] },
  { title: "Dossiers", url: "/dossiers", icon: FolderOpen, roles: ['admin', 'funeral_director'] },
  { title: "Taken", url: "/taken", icon: CheckSquare, roles: ['admin', 'funeral_director'] },
  { title: "Documenten", url: "/documenten", icon: FileText, roles: ['admin', 'funeral_director'] },
  { title: "Planning", url: "/planning", icon: Calendar, roles: ['admin', 'funeral_director'] },
  { title: "Facturatie", url: "/facturatie", icon: Receipt, roles: ['admin', 'funeral_director'] },
  
  // Insurer
  { title: "Dashboard", url: "/insurer", icon: LayoutDashboard, roles: ['insurer'] },
  { title: "Facturen", url: "/insurer/facturen", icon: Receipt, roles: ['insurer'] },
  { title: "Rapportage", url: "/insurer/rapportage", icon: BarChart3, roles: ['insurer'] },
  
  // Mortuarium
  { title: "Dashboard", url: "/wasplaats", icon: LayoutDashboard, roles: ['wasplaats'] },
  { title: "Koelcellen", url: "/wasplaats/koelcellen", icon: FolderOpen, roles: ['wasplaats'] },
  { title: "Facturatie", url: "/wasplaats/facturatie", icon: Receipt, roles: ['wasplaats'] },
  
  // Mosque
  { title: "Aanvragen", url: "/moskee", icon: LayoutDashboard, roles: ['mosque'] },
  { title: "Beschikbaarheid", url: "/moskee/beschikbaarheid", icon: PiMosque, roles: ['mosque'] },
  
  // Family
  { title: "Dashboard", url: "/familie", icon: LayoutDashboard, roles: ['family'] },
  { title: "Mijn Documenten", url: "/mijn-documenten", icon: Upload, roles: ['family'] },
  { title: "Chat", url: "/familie/chat", icon: MessageSquare, roles: ['family'] },
  
  // Settings for all
  { title: "Instellingen", url: "/instellingen", icon: Settings, roles: ['admin', 'funeral_director', 'family', 'insurer', 'wasplaats', 'mosque', 'platform_admin', 'org_admin', 'reviewer', 'support'] },
];

export function AppSidebar() {
  const { role, loading } = useUserRole();

  const filteredMenuItems = menuItems.filter(item => 
    role && item.roles.includes(role)
  );

  if (loading) {
    return (
      <Sidebar className="border-r">
        <SidebarContent>
          <div className="px-6 py-6 border-b border-sidebar-border">
            <img src={logoHorizontal} alt="JanazApp" className="h-8 brightness-0 invert" />
            <p className="text-xs text-sidebar-foreground/70 mt-2">Laden...</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="px-6 py-6 border-b border-sidebar-border">
          <img src={logoHorizontal} alt="JanazApp" className="h-8 brightness-0 invert" />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-sidebar-foreground/70">{getRoleDisplayName(role)} Portal</p>
            <LanguageSwitcher />
          </div>
        </div>
        
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-6 text-sidebar-foreground/60 text-xs uppercase tracking-wider">Navigatie</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
