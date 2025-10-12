import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  created_at: string;
  dossier_id: string | null;
  facility_org_id: string | null;
  dossiers?: {
    display_id: string;
    deceased_name: string;
  };
  facility_organization?: {
    name: string;
  };
}

export default function FDReceivedInvoices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch received invoices (gericht aan deze FD-org)
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["fd-received-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          dossiers(display_id, deceased_name)
        `)
        .eq("invoice_type", "MORTUARIUM")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch facility org names separately
      const invoicesWithOrgs = await Promise.all(
        (data || []).map(async (invoice) => {
          if (invoice.facility_org_id) {
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", invoice.facility_org_id)
              .single();
            return { ...invoice, facility_organization: org };
          }
          return invoice;
        })
      );
      
      return invoicesWithOrgs as Invoice[];
    },
  });

  // Acknowledge receipt mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoice_actions")
        .insert({
          invoice_id: invoiceId,
          action: "ACK",
          user_id: (await supabase.auth.getUser()).data.user?.id,
          metadata: { acknowledged_at: new Date().toISOString() },
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ontvangst bevestigd");
      queryClient.invalidateQueries({ queryKey: ["fd-received-invoices"] });
    },
    onError: (error) => {
      toast.error("Fout bij bevestigen: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      DRAFT: "outline",
      SENT: "default",
      PAID: "secondary",
      OVERDUE: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailDialogOpen(true);
  };

  const handleAcknowledge = (invoiceId: string) => {
    acknowledgeMutation.mutate(invoiceId);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // PDF download functionality - to be implemented
    toast.error("PDF niet beschikbaar");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardContent className="p-8">
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                Ontvangen facturen
              </h1>
              <p className="text-sm text-muted-foreground">
                Mortuarium facturen gericht aan uw organisatie
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardHeader>
            <CardTitle>Facturen van mortuarium</CardTitle>
            <CardDescription>
              Bekijk en download ontvangen facturen van mortuaria
            </CardDescription>
          </CardHeader>
          <CardContent>
          {!invoices || invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Geen facturen ontvangen
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Mortuarium</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.facility_organization?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.dossiers
                        ? `${invoice.dossiers.display_id} - ${invoice.dossiers.deceased_name}`
                        : "-"}
                    </TableCell>
                    <TableCell>€ {invoice.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.created_at), "dd MMM yyyy", {
                        locale: nl,
                      })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(invoice)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === "SENT" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAcknowledge(invoice.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Bevestig
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Factuur {selectedInvoice?.invoice_number}</DialogTitle>
              <DialogDescription>
                Van {selectedInvoice?.facility_organization?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{selectedInvoice && getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Totaalbedrag</p>
                    <p className="mt-1 text-lg font-semibold">
                    € {selectedInvoice?.total.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dossier</p>
                  <p className="mt-1">
                    {selectedInvoice?.dossiers
                      ? `${selectedInvoice.dossiers.display_id} - ${selectedInvoice.dossiers.deceased_name}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Datum</p>
                  <p className="mt-1">
                    {selectedInvoice &&
                      format(new Date(selectedInvoice.created_at), "dd MMMM yyyy", {
                        locale: nl,
                      })}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Sluiten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
