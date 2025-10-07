import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface RouteGuardProps {
  children: React.ReactNode;
}

// Define which routes are accessible by which roles/org types
const ROUTE_ACCESS: Record<string, {
  roles?: UserRole[];
  orgTypes?: ('FUNERAL_DIRECTOR' | 'MOSQUE' | 'WASPLAATS' | 'INSURER')[];
  requireOrgType?: boolean;
}> = {
  // Platform admin routes
  '/admin': { roles: ['platform_admin'] },
  
  // FD-specific routes
  '/dossiers': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/fd/': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/facturatie': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/beoordelingen': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/documenten': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/planning': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  '/taken': { roles: ['funeral_director', 'org_admin'], orgTypes: ['FUNERAL_DIRECTOR'], requireOrgType: true },
  
  // Mosque-specific routes
  '/moskee': { roles: ['mosque', 'org_admin'], orgTypes: ['MOSQUE'], requireOrgType: true },
  
  // Wasplaats-specific routes
  '/wasplaats': { roles: ['wasplaats', 'org_admin'], orgTypes: ['WASPLAATS'], requireOrgType: true },
  
  // Insurer-specific routes
  '/insurer': { roles: ['insurer', 'org_admin'], orgTypes: ['INSURER'], requireOrgType: true },
  
  // Family routes
  '/familie': { roles: ['family'] },
  
  // Shared routes (accessible by all authenticated users)
  '/instellingen': { roles: ['funeral_director', 'family', 'insurer', 'wasplaats', 'mosque', 'org_admin'] },
  '/team': { roles: ['org_admin'] },
};

export const RouteGuard = ({ children }: RouteGuardProps) => {
  const { roles, organizationType, loading } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // Find matching route config
    const matchedRoute = Object.entries(ROUTE_ACCESS).find(([path]) => 
      location.pathname.startsWith(path)
    );

    if (!matchedRoute) {
      // No specific route restriction, allow access
      return;
    }

    const [, config] = matchedRoute;

    // If route requires org type, wait until it's loaded
    if (config.requireOrgType && organizationType === null) {
      return; // Still loading organization type
    }

    // Check if user has ANY of the required roles
    const hasRequiredRole = config.roles?.some(requiredRole => roles.includes(requiredRole));
    
    if (config.roles && !hasRequiredRole) {
      console.warn(`[RouteGuard] Access denied: user roles ${roles.join(', ')} not in allowed roles`, config.roles);
      navigate('/');
      return;
    }

    // Check org type access (important for multi-role users like org_admin + mosque)
    if (config.requireOrgType && config.orgTypes) {
      if (!organizationType || !config.orgTypes.includes(organizationType)) {
        console.warn(`[RouteGuard] Access denied: org type ${organizationType} not in allowed types`, config.orgTypes);
        navigate('/');
        return;
      }
    }

  }, [roles, organizationType, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};
