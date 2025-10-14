import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Invoice = {
  id: string;
  invoice_number: string;
  dossier_id: string;
  fd_org_id: string;
  status: string;
  total: number;
  issued_at: string | null;
  created_at: string;
  dossier: {
    display_id: string;
    deceased_name: string;
  } | null;
  fd_organization: {
    name: string;
  } | null;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500 text-white border-0",
  ISSUED: "bg-blue-600 text-white border-0",
  PAID: "bg-green-600 text-white border-0",
  NEEDS_INFO: "bg-orange-600 text-white border-0",
  CANCELLED: "bg-red-600 text-white border-0",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Concept",
  ISSUED: "Uitgegeven",
  PAID: "Betaald",
  NEEDS_INFO: "Info Nodig",
  CANCELLED: "Geannuleerd",
};

export default function WasplaatsFacturatie() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewInvoiceDialogOpen, setIsNewInvoiceDialogOpen] = useState(false);
  const [dossierSearchTerm, setDossierSearchTerm] = useState("");
  const [fdSearchTerm, setFdSearchTerm] = useState("");
  const [searchedDossiers, setSearchedDossiers] = useState<any[]>([]);
  const [searchedFDs, setSearchedFDs] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          dossier_id,
          fd_org_id,
          status,
          total,
          issued_at,
          created_at,
          dossier:dossiers (
            display_id,
            deceased_name
          ),
          fd_organization:organizations!invoices_fd_org_id_fkey (
            name
          )
        `)
        .eq("facility_org_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data as any || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(searchLower) ||
      inv.dossier?.display_id?.toLowerCase().includes(searchLower) ||
      inv.dossier?.deceased_name?.toLowerCase().includes(searchLower) ||
      inv.fd_organization?.name?.toLowerCase().includes(searchLower)
    );
  });

  const searchDossiers = async () => {
    if (!dossierSearchTerm.trim()) {
      setSearchedDossiers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          id,
          display_id,
          deceased_name,
          ref_number,
          assigned_fd_org_id,
          fd_organization:organizations!dossiers_assigned_fd_org_id_fkey (
            name
          )
        `)
        .or(`display_id.ilike.%${dossierSearchTerm}%,deceased_name.ilike.%${dossierSearchTerm}%,ref_number.ilike.%${dossierSearchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchedDossiers(data || []);
    } catch (error) {
      console.error("Error searching dossiers:", error);
    }
  };

  const searchFDs = async () => {
    if (!fdSearchTerm.trim()) {
      setSearchedFDs([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, contact_email, contact_phone")
        .eq("type", "FUNERAL_DIRECTOR")
        .ilike("name", `%${fdSearchTerm}%`)
        .limit(10);

      if (error) throw error;
      setSearchedFDs(data || []);
    } catch (error) {
      console.error("Error searching FDs:", error);
    }
  };

  const handleDossierSelect = (dossierId: string) => {
    setIsNewInvoiceDialogOpen(false);
    navigate(`/wasplaats/facturatie/nieuw?dossier=${dossierId}`);
  };

  const handleFDSelect = (fdId: string) => {
    setIsNewInvoiceDialogOpen(false);
    navigate(`/wasplaats/facturatie/nieuw?fd=${fdId}`);
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Financieel</p>
                  <h1 className="text-2xl font-bold tracking-tight">Facturatie</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                Beheer facturen voor wasplaatsdiensten
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsNewInvoiceDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Factuur
              </Button>
            </div>
          </CardContent>
        </Card>

      <Dialog open={isNewInvoiceDialogOpen} onOpenChange={setIsNewInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Factuur Aanmaken</DialogTitle>
            <DialogDescription>
              Zoek een dossier of uitvaartonderneming om een factuur voor aan te maken
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="dossier" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dossier">Zoek op Dossier</TabsTrigger>
              <TabsTrigger value="fd">Zoek op Uitvaartonderneming</TabsTrigger>
            </TabsList>

            <TabsContent value="dossier" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op dossier ID, referentie of naam overledene..."
                  value={dossierSearchTerm}
                  onChange={(e) => {
                    setDossierSearchTerm(e.target.value);
                    searchDossiers();
                  }}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchedDossiers.length > 0 ? (
                  searchedDossiers.map((dossier) => (
                    <Card
                      key={dossier.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleDossierSelect(dossier.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{dossier.display_id || dossier.ref_number}</p>
                          <p className="text-sm text-muted-foreground">{dossier.deceased_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {dossier.fd_organization?.name || 'Geen FD toegewezen'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Selecteer
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : dossierSearchTerm ? (
                  <p className="text-center text-muted-foreground py-8">
                    Geen dossiers gevonden
                  </p>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Begin met typen om te zoeken
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="fd" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam uitvaartonderneming..."
                  value={fdSearchTerm}
                  onChange={(e) => {
                    setFdSearchTerm(e.target.value);
                    searchFDs();
                  }}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchedFDs.length > 0 ? (
                  searchedFDs.map((fd) => (
                    <Card
                      key={fd.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleFDSelect(fd.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{fd.name}</p>
                          {fd.contact_email && (
                            <p className="text-sm text-muted-foreground">{fd.contact_email}</p>
                          )}
                          {fd.contact_phone && (
                            <p className="text-xs text-muted-foreground">{fd.contact_phone}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          Selecteer
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : fdSearchTerm ? (
                  <p className="text-center text-muted-foreground py-8">
                    Geen uitvaartondernemingen gevonden
                  </p>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Begin met typen om te zoeken
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Facturen</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op factuurnummer, dossier, overledene..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">Nummer</TableHead>
                <TableHead className="font-medium text-sm">Dossier</TableHead>
                <TableHead className="font-medium text-sm">Uitvaartondernemer</TableHead>
                <TableHead className="font-medium text-sm">Datum</TableHead>
                <TableHead className="text-right font-medium text-sm">Bedrag</TableHead>
                <TableHead className="font-medium text-sm">Status</TableHead>
                <TableHead className="text-right font-medium text-sm">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                    Geen facturen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium font-mono text-sm">
                      {invoice.invoice_number || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{invoice.dossier?.display_id || '—'}</TableCell>
                    <TableCell className="text-sm">{invoice.fd_organization?.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.issued_at
                        ? format(new Date(invoice.issued_at), "dd-MM-yyyy", { locale: nl })
                        : format(new Date(invoice.created_at), "dd-MM-yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      €{invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusColors[invoice.status] || ""}`}>
                        {statusLabels[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/wasplaats/facturatie/${invoice.id}`)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
