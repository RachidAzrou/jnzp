import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TopBar } from "@/components/TopBar";

type Invoice = {
  id: string;
  invoice_number: string;
  dossier_id: string;
  status: string;
  subtotal: number;
  vat: number;
  total: number;
  issued_at: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  created_at: string;
  needs_info_reason: string | null;
  insurer_notes: string | null;
  dossiers: {
    ref_number: string;
    deceased_name: string;
    display_id: string;
  };
};

type InvoiceItem = {
  id: string;
  code: string;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-warning text-warning-foreground",
  NEEDS_INFO: "bg-blue-500 text-white",
  APPROVED: "bg-green-500 text-white",
  PAID: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Concept",
  ISSUED: "Te accorderen",
  NEEDS_INFO: "Info nodig",
  APPROVED: "Geaccordeerd",
  PAID: "Betaald",
  CANCELLED: "Geannuleerd",
};

export default function InsurerInvoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [needsInfoReason, setNeedsInfoReason] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

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
        .eq("role", "insurer")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          dossiers!inner (
            ref_number,
            deceased_name,
            display_id,
            insurer_org_id
          )
        `)
        .eq("dossiers.insurer_org_id", userRole.organization_id)
        .neq("status", "DRAFT")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Fout",
        description: "Kon facturen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (error) throw error;
      if (data) setInvoiceItems(data);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
    }
  };

  const approveInvoice = async (invoiceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error: updateError } = await supabase
        .from("invoices")
        .update({ status: "APPROVED" })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("invoice_actions").insert({
        invoice_id: invoiceId,
        user_id: user.id,
        action: "APPROVED",
      });

      toast({
        title: "Succes",
        description: "Factuur geaccordeerd",
      });

      fetchInvoices();
      setIsDetailOpen(false);
    } catch (error) {
      console.error("Error approving invoice:", error);
      toast({
        title: "Fout",
        description: "Kon factuur niet accorderen",
        variant: "destructive",
      });
    }
  };

  const requestMoreInfo = async (invoiceId: string) => {
    if (!needsInfoReason.trim()) {
      toast({
        title: "Fout",
        description: "Reden is verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "NEEDS_INFO",
          needs_info_reason: needsInfoReason,
        })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("invoice_actions").insert({
        invoice_id: invoiceId,
        user_id: user.id,
        action: "NEEDS_INFO",
        reason: needsInfoReason,
      });

      toast({
        title: "Succes",
        description: "Extra informatie gevraagd",
      });

      setNeedsInfoReason("");
      fetchInvoices();
      setIsDetailOpen(false);
    } catch (error) {
      console.error("Error requesting info:", error);
      toast({
        title: "Fout",
        description: "Kon verzoek niet versturen",
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    if (!paymentDate || !paymentRef.trim()) {
      toast({
        title: "Fout",
        description: "Betaaldatum en referentie zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "PAID",
          paid_at: paymentDate,
          payment_reference: paymentRef,
        })
        .eq("id", invoiceId);

      if (updateError) throw updateError;

      // Log action
      await supabase.from("invoice_actions").insert({
        invoice_id: invoiceId,
        user_id: user.id,
        action: "PAID",
        metadata: { payment_reference: paymentRef },
      });

      toast({
        title: "Succes",
        description: "Factuur gemarkeerd als betaald",
      });

      setPaymentDate("");
      setPaymentRef("");
      fetchInvoices();
      setIsDetailOpen(false);
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const openInvoiceDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchInvoiceItems(invoice.id);
    setIsDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="p-6">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturen</h1>
          <p className="text-muted-foreground mt-1">Overzicht van ingediende facturen</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facturen Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factuurnummer</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Overledene</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.dossiers.display_id}</TableCell>
                    <TableCell>{invoice.dossiers.deceased_name}</TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell>€{Number(invoice.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status]}>
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openInvoiceDetail(invoice)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Bekijken
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Geen facturen gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Factuur {selectedInvoice?.invoice_number} - {selectedInvoice?.dossiers.display_id}
              </DialogTitle>
            </DialogHeader>

            {selectedInvoice && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Factuurlijnen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Prijs</TableHead>
                          <TableHead>Bedrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.code}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{item.qty}</TableCell>
                            <TableCell>€{Number(item.unit_price).toFixed(2)}</TableCell>
                            <TableCell>€{Number(item.amount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotaal:</span>
                        <span>€{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BTW (21%):</span>
                        <span>€{Number(selectedInvoice.vat).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Totaal:</span>
                        <span>€{Number(selectedInvoice.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedInvoice.needs_info_reason && (
                  <Card className="border-blue-500">
                    <CardHeader>
                      <CardTitle className="text-blue-600 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Gevraagde informatie
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedInvoice.needs_info_reason}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Acties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span>Huidige status:</span>
                      <Badge className={statusColors[selectedInvoice.status]}>
                        {statusLabels[selectedInvoice.status]}
                      </Badge>
                    </div>

                    {selectedInvoice.status === "ISSUED" && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveInvoice(selectedInvoice.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accorderen
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Meer informatie nodig (verplichte reden)</Label>
                          <Textarea
                            placeholder="Leg uit welke informatie nodig is..."
                            value={needsInfoReason}
                            onChange={(e) => setNeedsInfoReason(e.target.value)}
                            rows={3}
                          />
                          <Button
                            variant="outline"
                            onClick={() => requestMoreInfo(selectedInvoice.id)}
                            disabled={!needsInfoReason.trim()}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Vraag meer info
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedInvoice.status === "APPROVED" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Betaaldatum *</Label>
                            <Input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Betalingsreferentie *</Label>
                            <Input
                              placeholder="Bv. SEPA-12345"
                              value={paymentRef}
                              onChange={(e) => setPaymentRef(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => markAsPaid(selectedInvoice.id)}
                          disabled={!paymentDate || !paymentRef.trim()}
                        >
                          Markeer als Betaald
                        </Button>
                      </div>
                    )}

                    {selectedInvoice.status === "PAID" && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-green-800 font-medium">
                          ✓ Factuur is betaald op{" "}
                          {selectedInvoice.paid_at && new Date(selectedInvoice.paid_at).toLocaleDateString("nl-NL")}
                        </p>
                        {selectedInvoice.payment_reference && (
                          <p className="text-sm text-green-700 mt-1">
                            Referentie: {selectedInvoice.payment_reference}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
