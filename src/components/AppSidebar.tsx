import { Home, FolderOpen, CheckSquare, FileText, Calendar, Settings, Upload, LayoutDashboard, Receipt, MessageSquare, BarChart3 } from "lucide-react";
import { CgSmartHomeRefrigerator } from "react-icons/cg";
import { MdOutlineMosque } from "react-icons/md";
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
import logoHorizontal from "@/assets/logo-horizontal.png";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
};

const menuItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: Home, roles: ['admin', 'funeral_director'] },
  { title: "Dashboard", url: "/insurer", icon: LayoutDashboard, roles: ['insurer'] },
  { title: "Dashboard", url: "/familie", icon: LayoutDashboard, roles: ['family'] },
  { title: "Dashboard", url: "/wasplaats", icon: LayoutDashboard, roles: ['wasplaats'] },
  { title: "Aanvragen", url: "/moskee", icon: LayoutDashboard, roles: ['mosque'] },
  { title: "Dossiers", url: "/dossiers", icon: FolderOpen, roles: ['admin', 'funeral_director'] },
  { title: "Taken", url: "/taken", icon: CheckSquare, roles: ['admin', 'funeral_director'] },
  { title: "Documenten", url: "/documenten", icon: FileText, roles: ['admin', 'funeral_director'] },
  { title: "Planning", url: "/planning", icon: Calendar, roles: ['admin', 'funeral_director'] },
  { title: "Facturatie", url: "/facturatie", icon: Receipt, roles: ['admin', 'funeral_director'] },
  
  { title: "Facturen", url: "/insurer/facturen", icon: Receipt, roles: ['insurer'] },
  { title: "Rapportage", url: "/insurer/rapportage", icon: BarChart3, roles: ['insurer'] },
  
  { title: "Koelcellen", url: "/wasplaats/koelcellen", icon: CgSmartHomeRefrigerator, roles: ['wasplaats'] },
  { title: "Facturatie", url: "/wasplaats/facturatie", icon: Receipt, roles: ['wasplaats'] },
  { title: "Beschikbaarheid", url: "/moskee/beschikbaarheid", icon: MdOutlineMosque, roles: ['mosque'] },
  { title: "Mijn Documenten", url: "/mijn-documenten", icon: Upload, roles: ['family'] },
  { title: "Chat", url: "/familie/chat", icon: MessageSquare, roles: ['family'] },
  { title: "Instellingen", url: "/instellingen", icon: Settings, roles: ['admin', 'funeral_director', 'family', 'insurer', 'wasplaats', 'mosque'] },
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
          <p className="text-xs text-sidebar-foreground/70 mt-2">{getRoleDisplayName(role)} Portal</p>
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
