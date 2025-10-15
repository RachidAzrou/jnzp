import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, AlertCircle, Search, Clock, Euro, Receipt } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KPICard } from "@/components/KPICard";

const getCurrentDate = () => {
  return new Date().toLocaleDateString("nl-NL", { 
    weekday: "long", 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
};

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
  ISSUED: "Ontvangen",
  NEEDS_INFO: "Info nodig",
  APPROVED: "Goedgekeurd",
  PAID: "Betaald",
  CANCELLED: "Geannuleerd",
};

export default function InsurerInvoices() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [needsInfoReason, setNeedsInfoReason] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentRef, setPaymentRef] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
          paid_at: paymentDate ? format(paymentDate, "yyyy-MM-dd") : null,
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

      setPaymentDate(new Date());
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
      <div className="p-6">Laden...</div>
    );
  }

  // Calculate KPIs
  const totalInvoices = invoices.length;
  const pendingApproval = invoices.filter(i => i.status === "ISSUED").length;
  const paidInvoices = invoices.filter(i => i.status === "PAID").length;
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const paidAmount = invoices.filter(i => i.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.total), 0);
  const outstandingAmount = totalAmount - paidAmount;

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.dossiers?.ref_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.dossiers?.deceased_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Verzekeraar</p>
                <h1 className="text-2xl font-bold tracking-tight">Facturen</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground capitalize">{getCurrentDate()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-6 md:grid-cols-4">
          <KPICard
            title={t("kpi.totalInvoices")}
            value={totalInvoices.toString()}
            icon={FileText}
          />
          <KPICard
            title={t("kpi.toApprove")}
            value={pendingApproval.toString()}
            icon={Clock}
          />
          <KPICard
            title={t("kpi.paid")}
            value={`${paidInvoices} (${totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0}%)`}
            icon={CheckCircle}
          />
          <KPICard
            title={t("kpi.outstandingAmount")}
            value={`€${outstandingAmount.toFixed(2)}`}
            icon={Euro}
          />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("placeholders.searchDossierInvoiceDeceased")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="ISSUED">Ontvangen</SelectItem>
                <SelectItem value="NEEDS_INFO">Info nodig</SelectItem>
                <SelectItem value="APPROVED">Goedgekeurd</SelectItem>
                <SelectItem value="PAID">Betaald</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium">Facturen Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium text-sm">Factuurnummer</TableHead>
                  <TableHead className="font-medium text-sm">Dossier</TableHead>
                  <TableHead className="font-medium text-sm">Overledene</TableHead>
                  <TableHead className="font-medium text-sm">Datum</TableHead>
                  <TableHead className="font-medium text-sm">Bedrag</TableHead>
                  <TableHead className="font-medium text-sm">Status</TableHead>
                  <TableHead className="font-medium text-sm">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-sm">{invoice.dossiers.display_id}</TableCell>
                    <TableCell className="text-sm">{invoice.dossiers.deceased_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">€{Number(invoice.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[invoice.status]} text-xs`}>
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInvoiceDetail(invoice)}
                      >
                        Bekijken
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      {searchTerm || statusFilter !== "all" 
                        ? "Geen facturen gevonden met deze filters" 
                        : "Geen facturen gevonden"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoice Detail Dialog */}
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

                    {selectedInvoice.status === "RECEIVED" && (
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
                            placeholder={t("placeholders.explainRequiredInfo")}
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
                            <DatePicker
                              date={paymentDate}
                              onSelect={setPaymentDate}
                              placeholder={t("placeholders.selectPaymentDate")}
                              disabled={(date) => date > new Date()}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Betalingsreferentie *</Label>
                            <Input
                              placeholder={t("placeholders.paymentReference")}
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
  );
}