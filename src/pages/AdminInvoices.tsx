import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface Invoice {
  id: string;
  invoice_number: string | null;
  status: string;
  total: number;
  created_at: string;
  dossier_id: string;
}

export default function AdminInvoices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon facturen niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="text-xs">Concept</Badge>;
      case "ISSUED":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs">Verzonden</Badge>;
      case "PAID":
        return <Badge className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs">Betaald</Badge>;
      case "NEEDS_INFO":
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-0 text-xs">Info nodig</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-600 hover:bg-red-700 text-white border-0 text-xs">Afgewezen</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const handleExport = () => {
    const csv = [
      ["Factuurnummer", "Status", "Bedrag", "Datum"],
      ...invoices.map((inv) => [
        inv.invoice_number || "—",
        inv.status,
        `€${inv.total.toFixed(2)}`,
        new Date(inv.created_at).toLocaleDateString("nl-NL"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facturen-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast({
      title: "Geëxporteerd",
      description: "Facturen zijn geëxporteerd naar CSV",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          {t("admin.invoices.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overzicht van alle facturen in het platform
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex justify-end">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporteer CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.invoices.invoicesCount")} ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.invoiceNumber")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.status")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.amount")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                    Geen facturen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">
                      {invoice.invoice_number || "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="font-medium text-sm">
                      €{invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString("nl-NL")}
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
