import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  dossier_id: string;
  status: string;
  subtotal: number;
  vat: number;
  total: number;
  issued_at: string | null;
  created_at: string;
  dossiers: {
    ref_number: string;
    deceased_name: string;
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

type Dossier = {
  id: string;
  ref_number: string;
  deceased_name: string;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-warning text-warning-foreground",
  PAID: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Concept",
  ISSUED: "Uitgegeven",
  PAID: "Betaald",
  CANCELLED: "Geannuleerd",
};

export default function Facturatie() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [newItem, setNewItem] = useState({
    code: "",
    description: "",
    qty: 1,
    unit_price: 0,
  });
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    fetchInvoices();
    fetchDossiers();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          dossiers (
            ref_number,
            deceased_name
          )
        `)
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

  const fetchDossiers = async () => {
    try {
      const { data, error } = await supabase
        .from("dossiers")
        .select("id, ref_number, deceased_name")
        .order("ref_number");

      if (error) throw error;
      if (data) setDossiers(data);
    } catch (error) {
      console.error("Error fetching dossiers:", error);
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

  const createInvoice = async () => {
    if (!selectedDossierId) {
      toast({
        title: "Fout",
        description: "Selecteer een dossier",
        variant: "destructive",
      });
      return;
    }

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

      const { data: dossier } = await supabase
        .from("dossiers")
        .select("assigned_fd_org_id")
        .eq("id", selectedDossierId)
        .single();

      const { error } = await supabase
        .from("invoices")
        .insert({
          dossier_id: selectedDossierId,
          facility_org_id: userRole.organization_id,
          fd_org_id: dossier?.assigned_fd_org_id,
          status: "DRAFT",
          subtotal: 0,
          vat: 0,
          total: 0,
        });

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Factuur aangemaakt",
      });

      setIsNewInvoiceOpen(false);
      setSelectedDossierId("");
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: "Fout",
        description: "Kon factuur niet aanmaken",
        variant: "destructive",
      });
    }
  };

  const addInvoiceItem = async (invoiceId: string) => {
    if (!newItem.code || !newItem.description) {
      toast({
        title: "Fout",
        description: "Vul alle velden in",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = newItem.qty * newItem.unit_price;

      const { error } = await supabase
        .from("invoice_items")
        .insert({
          invoice_id: invoiceId,
          code: newItem.code,
          description: newItem.description,
          qty: newItem.qty,
          unit_price: newItem.unit_price,
          amount: amount,
        });

      if (error) throw error;

      // Recalculate totals
      await recalculateInvoice(invoiceId);

      toast({
        title: "Succes",
        description: "Factuurlijn toegevoegd",
      });

      setNewItem({ code: "", description: "", qty: 1, unit_price: 0 });
      fetchInvoiceItems(invoiceId);
    } catch (error) {
      console.error("Error adding invoice item:", error);
      toast({
        title: "Fout",
        description: "Kon factuurlijn niet toevoegen",
        variant: "destructive",
      });
    }
  };

  const deleteInvoiceItem = async (itemId: string, invoiceId: string) => {
    try {
      const { error } = await supabase
        .from("invoice_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await recalculateInvoice(invoiceId);
      fetchInvoiceItems(invoiceId);

      toast({
        title: "Succes",
        description: "Factuurlijn verwijderd",
      });
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      toast({
        title: "Fout",
        description: "Kon factuurlijn niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const recalculateInvoice = async (invoiceId: string) => {
    try {
      const { data: items } = await supabase
        .from("invoice_items")
        .select("amount")
        .eq("invoice_id", invoiceId);

      const subtotal = items?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const vat = subtotal * 0.21;
      const total = subtotal + vat;

      await supabase
        .from("invoices")
        .update({ subtotal, vat, total })
        .eq("id", invoiceId);

      fetchInvoices();
    } catch (error) {
      console.error("Error recalculating invoice:", error);
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === "ISSUED") {
        updateData.issued_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("invoices")
        .update(updateData)
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Status bijgewerkt",
      });

      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) {
        const updated = invoices.find(i => i.id === invoiceId);
        if (updated) setSelectedInvoice({ ...updated, status });
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    if (!paymentDate) {
      toast({
        title: "Fout",
        description: "Selecteer een betaaldatum",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "PAID",
          paid_at: paymentDate,
        })
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Factuur gemarkeerd als betaald",
      });

      setPaymentDate("");
      setPaymentRef("");
      fetchInvoices();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast({
        title: "Fout",
        description: "Kon factuur niet markeren als betaald",
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
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/wasplaats")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Facturatie</h1>
        </div>

        <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Factuur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Factuur</DialogTitle>
              <DialogDescription>
                Maak een nieuwe factuur aan voor een dossier.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dossier">Dossier</Label>
                <Select value={selectedDossierId} onValueChange={setSelectedDossierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer dossier" />
                  </SelectTrigger>
                  <SelectContent>
                    {dossiers.map((dossier) => (
                      <SelectItem key={dossier.id} value={dossier.id}>
                        {dossier.ref_number} - {dossier.deceased_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewInvoiceOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={createInvoice}>Aanmaken</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturen Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell>{invoice.dossiers.ref_number}</TableCell>
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
                      Openen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Factuur - {selectedInvoice?.dossiers.ref_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Factuurlijnen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInvoice.status === "DRAFT" && (
                    <div className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Code"
                        value={newItem.code}
                        onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                      />
                      <Input
                        placeholder="Omschrijving"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={newItem.qty}
                        onChange={(e) => setNewItem({ ...newItem, qty: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Prijs"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                      />
                      <Button onClick={() => addInvoiceItem(selectedInvoice.id)}>
                        Toevoegen
                      </Button>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Prijs</TableHead>
                        <TableHead>Bedrag</TableHead>
                        {selectedInvoice.status === "DRAFT" && <TableHead>Actie</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>€{Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>€{Number(item.amount).toFixed(2)}</TableCell>
                          {selectedInvoice.status === "DRAFT" && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteInvoiceItem(item.id, selectedInvoice.id)}
                              >
                                Verwijder
                              </Button>
                            </TableCell>
                          )}
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

              <Card>
                <CardHeader>
                  <CardTitle>Status & Acties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span>Huidige status:</span>
                    <Badge className={statusColors[selectedInvoice.status]}>
                      {statusLabels[selectedInvoice.status]}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {selectedInvoice.status === "DRAFT" && (
                      <Button onClick={() => updateInvoiceStatus(selectedInvoice.id, "ISSUED")}>
                        Uitgeven
                      </Button>
                    )}
                    {selectedInvoice.status === "ISSUED" && (
                      <>
                        <div className="flex gap-2 items-end">
                          <div className="space-y-2">
                            <Label>Betaaldatum</Label>
                            <Input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
                          <Button onClick={() => markAsPaid(selectedInvoice.id)}>
                            Markeer als Betaald
                          </Button>
                        </div>
                      </>
                    )}
                    {(selectedInvoice.status === "DRAFT" || selectedInvoice.status === "ISSUED") && (
                      <Button
                        variant="destructive"
                        onClick={() => updateInvoiceStatus(selectedInvoice.id, "CANCELLED")}
                      >
                        Annuleren
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
