import { Home, FolderOpen, CheckSquare, FileText, Calendar, BarChart3, Settings, Upload, LayoutDashboard } from "lucide-react";
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
  { title: "Rapporten", url: "/rapporten", icon: BarChart3, roles: ['admin', 'funeral_director', 'insurer'] },
  { title: "Koelcellen", url: "/wasplaats/koelcellen", icon: FolderOpen, roles: ['wasplaats'] },
  { title: "Beschikbaarheid", url: "/moskee/beschikbaarheid", icon: Calendar, roles: ['mosque'] },
  { title: "Mijn Documenten", url: "/mijn-documenten", icon: Upload, roles: ['family'] },
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
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold text-sidebar-foreground">JanazApp</h1>
            <p className="text-xs text-sidebar-foreground/70 mt-1">Laden...</p>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-sidebar-foreground">JanazApp</h1>
          <p className="text-xs text-sidebar-foreground/70 mt-1">{getRoleDisplayName(role)} Portal</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigatie</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
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
