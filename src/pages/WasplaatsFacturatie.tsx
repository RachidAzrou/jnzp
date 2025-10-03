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
        .eq("role", "wasplaats")
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

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturatie</h1>
          <p className="text-muted-foreground mt-1">
            Beheer facturen voor wasplaatsdiensten
          </p>
        </div>
        <Button onClick={() => navigate("/wasplaats/facturatie/nieuw")}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Factuur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturen</CardTitle>
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
              <TableRow>
                <TableHead>Nummer</TableHead>
                <TableHead>Dossier</TableHead>
                <TableHead>Overledene</TableHead>
                <TableHead>Uitvaartonderneming</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Bedrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Geen facturen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {invoice.invoice_number || '-'}
                    </TableCell>
                    <TableCell>{invoice.dossier?.display_id || '-'}</TableCell>
                    <TableCell>{invoice.dossier?.deceased_name || '-'}</TableCell>
                    <TableCell>{invoice.fd_organization?.name || '-'}</TableCell>
                    <TableCell>
                      {invoice.issued_at
                        ? format(new Date(invoice.issued_at), "dd-MM-yyyy", { locale: nl })
                        : format(new Date(invoice.created_at), "dd-MM-yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status] || ""}>
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
  );
}
