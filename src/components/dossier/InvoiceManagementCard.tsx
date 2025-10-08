import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Check, AlertCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface InvoiceManagementCardProps {
  dossierId: string;
  userRole: string;
}

export function InvoiceManagementCard({ dossierId, userRole }: InvoiceManagementCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionType, setActionType] = useState<'send' | 'pay' | null>(null);
  const [notes, setNotes] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["dossier-invoices", dossierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *
        `)
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, newStatus }: { invoiceId: string; newStatus: 'SENT' | 'PAID' }) => {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoiceId);

      if (error) throw error;

      // Log action
      const actionType = newStatus === 'SENT' ? 'SENT' : 'PAID';
      await supabase.from("invoice_actions").insert({
        invoice_id: invoiceId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: actionType,
        metadata: { notes },
      });

      // Log dossier event
      const eventType = newStatus === 'SENT' ? 'INVOICE_SENT' : 'INVOICE_PAID';
      const eventDesc = newStatus === 'SENT' ? 'verzonden' : 'betaald';
      await supabase.from("dossier_events").insert({
        dossier_id: dossierId,
        event_type: eventType,
        event_description: `Factuur ${eventDesc}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        metadata: { invoice_id: invoiceId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dossier-invoices", dossierId] });
      queryClient.invalidateQueries({ queryKey: ["dossier-tasks", dossierId] });
      toast({
        title: "Succes",
        description: actionType === 'send' ? "Factuur verzonden" : "Betaling geregistreerd",
      });
      setSelectedInvoice(null);
      setActionType(null);
      setNotes("");
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon factuur niet bijwerken",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; className?: string }> = {
      DRAFT: { variant: "secondary" },
      SENT: { variant: "default", className: "bg-blue-600" },
      PAID: { variant: "default", className: "bg-green-600" },
      OVERDUE: { variant: "destructive" },
      CANCELLED: { variant: "outline" },
    };
    const config = variants[status] || { variant: "secondary" };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const canSendInvoice = (invoice: any) => {
    if (userRole === 'mortuarium' && invoice.invoice_type === 'MORTUARIUM' && invoice.status === 'DRAFT') return true;
    if (userRole === 'funeral_director' && invoice.invoice_type === 'FD' && invoice.status === 'DRAFT') return true;
    return false;
  };

  const canPayInvoice = (invoice: any) => {
    if (userRole === 'funeral_director' && invoice.invoice_type in ['MORTUARIUM', 'CARGO'] && invoice.status === 'SENT') return true;
    if (userRole === 'insurer' && invoice.invoice_type === 'FD' && invoice.status === 'SENT') return true;
    return false;
  };

  const handleAction = (invoice: any, type: 'send' | 'pay') => {
    setSelectedInvoice(invoice);
    setActionType(type);
  };

  const confirmAction = () => {
    if (!selectedInvoice) return;
    updateInvoiceMutation.mutate({
      invoiceId: selectedInvoice.id,
      newStatus: actionType === 'send' ? 'SENT' : 'PAID',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facturen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturen Overzicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Van</TableHead>
                  <TableHead>Aan</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.invoice_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.invoice_type}</Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>€{Number(invoice.total || 0).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {canSendInvoice(invoice) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(invoice, 'send')}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Verstuur
                          </Button>
                        )}
                        {canPayInvoice(invoice) && (
                          <Button
                            size="sm"
                            onClick={() => handleAction(invoice, 'pay')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Betaal
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nog geen facturen voor dit dossier</p>
              <p className="text-sm text-muted-foreground mt-1">
                Facturen worden automatisch aangemaakt bij voltooiing van diensten
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionType !== null} onOpenChange={() => { setActionType(null); setSelectedInvoice(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'send' ? 'Factuur Verzenden' : 'Betaling Registreren'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'send'
                ? 'Bevestig dat u deze factuur wilt verzenden naar de betaler.'
                : 'Bevestig dat de betaling voor deze factuur is ontvangen.'}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Factuurnummer:</span> {selectedInvoice.invoice_number || 'Concept'}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Type:</span> {selectedInvoice.invoice_type}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Bedrag:</span> €{Number(selectedInvoice.total || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notities (optioneel)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Voeg eventuele opmerkingen toe..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setSelectedInvoice(null); }}>
              Annuleren
            </Button>
            <Button onClick={confirmAction} disabled={updateInvoiceMutation.isPending}>
              {updateInvoiceMutation.isPending ? 'Bezig...' : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
