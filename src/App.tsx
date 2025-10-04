import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useSessionActivity } from "@/hooks/useSessionActivity";
import Dashboard from "./pages/Dashboard";
import Dossiers from "./pages/Dossiers";
import Taken from "./pages/Taken";
import Documenten from "./pages/Documenten";
import Planning from "./pages/Planning";

import Instellingen from "./pages/Instellingen";
import MijnDocumenten from "./pages/MijnDocumenten";
import FamilieDashboard from "./pages/FamilieDashboard";
import FamilieIdentificatie from "./pages/FamilieIdentificatie";
import FamiliePolis from "./pages/FamiliePolis";
import FamilieLocatie from "./pages/FamilieLocatie";
import FamilieChat from "./pages/FamilieChat";
import FDChat from "./pages/FDChat";
import FDChatOverview from "./pages/FDChatOverview";
import InsurerChatOverview from "./pages/InsurerChatOverview";
import WasplaatsDashboard from "./pages/WasplaatsDashboard";
import WasplaatsKoelcellen from "./pages/WasplaatsKoelcellen";
import WasplaatsReservaties from "./pages/WasplaatsReservaties";
import WasplaatsFacturatie from "./pages/WasplaatsFacturatie";
import Facturatie from "./pages/Facturatie";
import FDFacturatie from "./pages/FDFacturatie";
import DossierDetail from "./pages/DossierDetail";
import MoskeeDashboard from "./pages/MoskeeDashboard";
import MoskeeAanvragen from "./pages/MoskeeAanvragen";
import MoskeeAanvraag from "./pages/MoskeeAanvraag";
import MoskeeBeschikbaarheid from "./pages/MoskeeBeschikbaarheid";
import InsurerDashboard from "./pages/InsurerDashboard";
import InsurerDossierOverview from "./pages/InsurerDossierOverview";
import InsurerDossierDocuments from "./pages/InsurerDossierDocuments";
import InsurerInvoices from "./pages/InsurerInvoices";
import InsurerRapportage from "./pages/InsurerRapportage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDirectory from "./pages/AdminDirectory";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminGDPR from "./pages/AdminGDPR";
import AdminIntegrations from "./pages/AdminIntegrations";
import AdminInvoices from "./pages/AdminInvoices";
import AdminUsers from "./pages/AdminUsers";
import AdminAudit from "./pages/AdminAudit";
import AdminConfig from "./pages/AdminConfig";
import AdminDossiers from "./pages/AdminDossiers";
import AdminDocumentReview from "./pages/AdminDocumentReview";
import TeamManagement from "./pages/TeamManagement";
import Auth from "./pages/Auth";
import Register from "./pages/Register";
import QRScan from "./pages/QRScan";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NotFound from "./pages/NotFound";
import { useUserRole, UserRole } from "./hooks/useUserRole";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Enable session activity tracking
  useSessionActivity();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const RoleProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RoleBasedHome = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role === 'wasplaats') {
    return <Navigate to="/wasplaats" replace />;
  }
  if (role === 'mosque') {
    return <Navigate to="/moskee" replace />;
  }
  if (role === 'insurer') {
    return <Navigate to="/insurer" replace />;
  }
  if (role === 'family') {
    return <Navigate to="/familie" replace />;
  }
  if (role === 'platform_admin' || role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'funeral_director' || role === 'org_admin') {
    return <Dashboard />;
  }

  return <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/register" element={<Register />} />
          <Route path="/qr-scan/:token" element={<QRScan />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                      <TopBar />
                      <main className="flex-1 p-3 sm:p-6 overflow-x-hidden">
                        <Routes>
                          <Route path="/" element={<RoleBasedHome />} />
                          <Route path="/dossiers" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <Dossiers />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/dossiers/:id" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <DossierDetail />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/taken" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <Taken />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/documenten" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director', 'family']}>
                              <Documenten />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/planning" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <Planning />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/facturatie" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <FDFacturatie />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/mijn-documenten" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <MijnDocumenten />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/familie" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <FamilieDashboard />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/familie/identificatie" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <FamilieIdentificatie />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/familie/polis" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <FamiliePolis />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/familie/locatie" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <FamilieLocatie />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/familie/chat" element={
                            <RoleProtectedRoute allowedRoles={['family']}>
                              <FamilieChat />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/wasplaats" element={
                            <RoleProtectedRoute allowedRoles={['wasplaats']}>
                              <WasplaatsDashboard />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/wasplaats/koelcellen" element={
                            <RoleProtectedRoute allowedRoles={['wasplaats']}>
                              <WasplaatsKoelcellen />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/wasplaats/reservaties/nieuw" element={
                            <RoleProtectedRoute allowedRoles={['wasplaats']}>
                              <WasplaatsReservaties />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/wasplaats/facturatie" element={
                            <RoleProtectedRoute allowedRoles={['wasplaats']}>
                              <WasplaatsFacturatie />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/moskee" element={
                            <RoleProtectedRoute allowedRoles={['mosque']}>
                              <MoskeeDashboard />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/moskee/aanvragen" element={
                            <RoleProtectedRoute allowedRoles={['mosque']}>
                              <MoskeeAanvragen />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/moskee/aanvraag/:id" element={
                            <RoleProtectedRoute allowedRoles={['mosque']}>
                              <MoskeeAanvraag />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/moskee/beschikbaarheid" element={
                            <RoleProtectedRoute allowedRoles={['mosque']}>
                              <MoskeeBeschikbaarheid />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerDashboard />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/dossier/:id" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerDossierOverview />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/dossier/:id/documenten" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerDossierDocuments />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/facturen" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerInvoices />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/rapportage" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerRapportage />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/fd/chat" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director', 'org_admin']}>
                              <FDChatOverview />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/chat" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <InsurerChatOverview />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/insurer/chat/:dossierId" element={
                            <RoleProtectedRoute allowedRoles={['insurer']}>
                              <FDChat />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/chat/:dossierId" element={
                            <RoleProtectedRoute allowedRoles={['admin', 'funeral_director']}>
                              <FDChat />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminDashboard />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/directory" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminDirectory />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/organizations" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminOrganizations />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/gdpr" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminGDPR />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/dossiers" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <Dossiers />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/integrations" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminIntegrations />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/invoices" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminInvoices />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/users" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminUsers />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/audit" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminAudit />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/config" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminConfig />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/dossiers" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminDossiers />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/admin/documents" element={
                            <RoleProtectedRoute allowedRoles={['platform_admin', 'admin']}>
                              <AdminDocumentReview />
                            </RoleProtectedRoute>
                          } />
                          <Route path="/instellingen" element={<Instellingen />} />
                          <Route path="/team" element={
                            <RoleProtectedRoute allowedRoles={['org_admin', 'admin', 'platform_admin']}>
                              <TeamManagement />
                            </RoleProtectedRoute>
                          } />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
