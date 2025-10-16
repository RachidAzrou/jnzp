import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, CheckCircle, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  created_at: string;
  dossier_id: string | null;
  fd_org_id: string | null;
  dossiers?: {
    display_id: string;
    deceased_name: string;
  };
  fd_organization?: {
    name: string;
  };
}

export default function MortuariumFacturatie() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  // Fetch invoices
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["mortuarium-invoices", filter],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          dossiers(display_id, deceased_name)
        `)
        .eq("invoice_type", "MORTUARIUM")
        .order("created_at", { ascending: false });

      // Filter is optional, all invoices shown if "ALL"

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch FD org names separately
      const invoicesWithOrgs = await Promise.all(
        (data || []).map(async (invoice) => {
          if (invoice.fd_org_id) {
            const { data: org } = await supabase
              .from("organizations")
              .select("name")
              .eq("id", invoice.fd_org_id)
              .single();
            return { ...invoice, fd_organization: org };
          }
          return invoice;
        })
      );
      
      return invoicesWithOrgs as Invoice[];
    },
  });

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: async ({ invoiceId, message }: { invoiceId: string; message: string }) => {
      const { error } = await supabase.rpc("fn_invoice_send", {
        p_invoice_id: invoiceId,
        p_message: message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("mortuarium.invoicing.invoiceSent"),
      });
      queryClient.invalidateQueries({ queryKey: ["mortuarium-invoices"] });
      setSendDialogOpen(false);
      setMessage("");
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({
        title: t("toasts.errors.sendError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark paid mutation
  const paidMutation = useMutation({
    mutationFn: async ({ invoiceId, note }: { invoiceId: string; note: string }) => {
      const { error } = await supabase.rpc("fn_invoice_mark_paid", {
        p_invoice_id: invoiceId,
        p_note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("mortuarium.invoicing.invoiceMarkedPaid"),
      });
      queryClient.invalidateQueries({ queryKey: ["mortuarium-invoices"] });
      setPaidDialogOpen(false);
      setNote("");
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({
        title: t("toasts.errors.markPaidError"),
        description: error.message,
        variant: "destructive",
      });
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

  const handleSend = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setSendDialogOpen(true);
  };

  const handleMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaidDialogOpen(true);
  };

  const confirmSend = () => {
    if (!selectedInvoice) return;
    sendMutation.mutate({ invoiceId: selectedInvoice.id, message });
  };

  const confirmPaid = () => {
    if (!selectedInvoice) return;
    paidMutation.mutate({ invoiceId: selectedInvoice.id, note });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
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
                  <p className="text-sm text-muted-foreground font-medium">{t("mortuarium.invoicing.financial")}</p>
                  <h1 className="text-2xl font-bold tracking-tight">{t("mortuarium.invoicing.title")}</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                {t("mortuarium.invoicing.subtitle")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-end">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("mortuarium.invoicing.newInvoice")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("mortuarium.invoicing.invoices")}</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("placeholders.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("mortuarium.invoicing.all")}</SelectItem>
                <SelectItem value="DRAFT">{t("mortuarium.invoicing.draft")}</SelectItem>
                <SelectItem value="SENT">{t("mortuarium.invoicing.sent")}</SelectItem>
                <SelectItem value="PAID">{t("mortuarium.invoicing.paid")}</SelectItem>
                <SelectItem value="OVERDUE">{t("mortuarium.invoicing.overdue")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!invoices || invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("mortuarium.invoicing.noInvoices")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("mortuarium.invoicing.number")}</TableHead>
                  <TableHead>{t("mortuarium.invoicing.dossier")}</TableHead>
                  <TableHead>{t("mortuarium.invoicing.fdOrganization")}</TableHead>
                  <TableHead>{t("mortuarium.invoicing.amount")}</TableHead>
                  <TableHead>{t("mortuarium.invoicing.status")}</TableHead>
                  <TableHead>{t("mortuarium.invoicing.date")}</TableHead>
                  <TableHead className="text-right">{t("mortuarium.invoicing.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.dossiers
                        ? `${invoice.dossiers.display_id} - ${invoice.dossiers.deceased_name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.fd_organization?.name || "-"}
                    </TableCell>
                    <TableCell>€ {invoice.total.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.created_at), "dd MMM yyyy", {
                        locale: nl,
                      })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === "DRAFT" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSend(invoice)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {t("mortuarium.invoicing.send")}
                        </Button>
                      )}
                      {invoice.status === "SENT" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkPaid(invoice)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t("mortuarium.invoicing.paid")}
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

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mortuarium.invoicing.sendInvoice")}</DialogTitle>
            <DialogDescription>
              {t("mortuarium.invoicing.sendInvoiceDesc", { number: selectedInvoice?.invoice_number, name: selectedInvoice?.fd_organization?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">{t("mortuarium.invoicing.message")}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("placeholders.addMessage")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmSend}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? t("mortuarium.invoicing.sending") : t("mortuarium.invoicing.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mortuarium.invoicing.markPaid")}</DialogTitle>
            <DialogDescription>
              {t("mortuarium.invoicing.markPaidDesc", { number: selectedInvoice?.invoice_number })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="note">{t("mortuarium.invoicing.note")}</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("placeholders.paymentReferenceDetails")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaidDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmPaid}
              disabled={paidMutation.isPending}
            >
              {paidMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
