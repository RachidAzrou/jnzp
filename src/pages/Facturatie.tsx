import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Search, Package } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";

type Invoice = {
  id: string;
  invoice_number: string;
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
    insurer_org_id: string | null;
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

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  default_price: number;
  default_vat_rate: number;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ISSUED: "bg-warning text-warning-foreground",
  NEEDS_INFO: "bg-blue-500 text-white",
  APPROVED: "bg-green-500 text-white",
  PAID: "bg-success text-success-foreground",
  CANCELLED: "bg-destructive text-destructive-foreground",
};

export default function Facturatie() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const statusLabels: Record<string, string> = {
    DRAFT: t("invoicing.statusDraft"),
    ISSUED: t("invoicing.statusIssued"),
    NEEDS_INFO: t("invoicing.statusNeedsInfo"),
    APPROVED: t("invoicing.statusApproved"),
    PAID: t("invoicing.statusPaid"),
    CANCELLED: t("invoicing.statusCancelled"),
  };
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [newItem, setNewItem] = useState({
    code: "",
    description: "",
    qty: 1,
    unit_price: 0,
  });
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    fetchInvoices();
    fetchDossiers();
    fetchCatalogItems();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          dossiers (
            ref_number,
            deceased_name,
            insurer_org_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setInvoices(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorLoadingInvoices"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.organization_id) return;

      const { data, error } = await supabase
        .from("catalog_items")
        .select("*")
        .eq("organization_id", userRole.organization_id)
        .eq("is_active", true)
        .order("code");

      if (error) throw error;
      if (data) setCatalogItems(data);
    } catch (error) {
      console.error("Error fetching catalog items:", error);
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
        title: t("common.error"),
        description: t("invoicing.selectDossier"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("common.notLoggedIn"));

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (!userRole?.organization_id) throw new Error(t("common.noOrganizationFound"));

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
        title: t("common.success"),
        description: t("invoicing.invoiceCreated"),
      });

      setIsNewInvoiceOpen(false);
      setSelectedDossierId("");
      fetchInvoices();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorCreatingInvoice"),
        variant: "destructive",
      });
    }
  };

  const addCatalogItemToInvoice = async (catalogItem: CatalogItem, invoiceId: string) => {
    try {
      const amount = catalogItem.default_price;

      const { error } = await supabase
        .from("invoice_items")
        .insert({
          invoice_id: invoiceId,
          code: catalogItem.code,
          description: catalogItem.name,
          qty: 1,
          unit_price: catalogItem.default_price,
          amount: amount,
        });

      if (error) throw error;

      await recalculateInvoice(invoiceId);

      toast({
        title: t("common.success"),
        description: t("invoicing.itemAdded"),
      });

      fetchInvoiceItems(invoiceId);
    } catch (error) {
      console.error("Error adding catalog item:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorAddingItem"),
        variant: "destructive",
      });
    }
  };

  const addInvoiceItem = async (invoiceId: string) => {
    if (!newItem.code || !newItem.description) {
      toast({
        title: t("common.error"),
        description: t("invoicing.fillAllFields"),
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

      await recalculateInvoice(invoiceId);

      toast({
        title: t("common.success"),
        description: t("invoicing.invoiceLineAdded"),
      });

      setNewItem({ code: "", description: "", qty: 1, unit_price: 0 });
      fetchInvoiceItems(invoiceId);
    } catch (error) {
      console.error("Error adding invoice item:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorAddingInvoiceLine"),
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
        title: t("common.success"),
        description: t("invoicing.invoiceLineDeleted"),
      });
    } catch (error) {
      console.error("Error deleting invoice item:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorDeletingInvoiceLine"),
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
        title: t("common.success"),
        description: t("invoicing.statusUpdated"),
      });

      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) {
        const updated = invoices.find(i => i.id === invoiceId);
        if (updated) setSelectedInvoice({ ...updated, status });
      }
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorUpdatingStatus"),
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    if (!paymentDate) {
      toast({
        title: t("common.error"),
        description: t("invoicing.selectPaymentDate"),
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "PAID",
          paid_at: paymentDate ? format(paymentDate, "yyyy-MM-dd") : null,
        })
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("invoicing.markedAsPaid"),
      });

      setPaymentDate(new Date());
      setPaymentRef("");
      fetchInvoices();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast({
        title: t("common.error"),
        description: t("invoicing.errorMarkingPaid"),
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
    return <div className="p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{t("invoicing.financial")}</p>
                  <h1 className="text-2xl font-bold tracking-tight">{t("invoicing.title")}</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                {t("invoicing.subtitle")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-end">
              <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("invoicing.newInvoice")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("invoicing.newInvoice")}</DialogTitle>
                    <DialogDescription>
                      {t("invoicing.newInvoiceDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dossier">{t("common.dossier")}</Label>
                      <Select value={selectedDossierId} onValueChange={setSelectedDossierId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("placeholders.selectDossier")} />
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
                      {t("common.cancel")}
                    </Button>
                    <Button onClick={createInvoice}>{t("invoicing.create")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("invoicing.invoicesOverview")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-medium text-sm">{t("common.dossier")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("invoicing.deceased")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("common.date")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("invoicing.amount")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("common.status")}</TableHead>
                  <TableHead className="font-medium text-sm">{t("invoicing.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{invoice.dossiers.ref_number}</TableCell>
                    <TableCell className="text-sm">{invoice.dossiers.deceased_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-sm font-medium">€{Number(invoice.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={invoice.status === 'PAID' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInvoiceDetail(invoice)}
                      >
                        {t("invoicing.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("invoicing.invoice")} {selectedInvoice?.invoice_number} - {selectedInvoice?.dossiers.ref_number}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              <Tabs defaultValue="items" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="items">{t("invoicing.invoiceLines")}</TabsTrigger>
                  <TabsTrigger value="catalog" disabled={selectedInvoice.status !== "DRAFT"}>
                    {t("invoicing.catalog")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {t("invoicing.catalog")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("placeholders.searchCodeOrName")}
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                        />
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("invoicing.code")}</TableHead>
                            <TableHead>{t("invoicing.name")}</TableHead>
                            <TableHead>{t("invoicing.type")}</TableHead>
                            <TableHead>{t("common.price")}</TableHead>
                            <TableHead>{t("invoicing.action")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {catalogItems
                            .filter(item => 
                              catalogSearch === "" ||
                              item.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                              item.name.toLowerCase().includes(catalogSearch.toLowerCase())
                            )
                            .map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-mono">{item.code}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                  <Badge variant={item.type === 'SERVICE' ? 'default' : 'secondary'}>
                                    {item.type === 'SERVICE' ? t("invoicing.service") : t("invoicing.product")}
                                  </Badge>
                                </TableCell>
                                <TableCell>€{Number(item.default_price).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    onClick={() => addCatalogItemToInvoice(item, selectedInvoice.id)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t("invoicing.add")}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="items" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("invoicing.invoiceLines")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedInvoice.status === "DRAFT" && (
                        <div className="grid grid-cols-5 gap-2">
                          <Input
                            placeholder={t("placeholders.customCode")}
                            value={newItem.code}
                            onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                          />
                          <Input
                            placeholder={t("placeholders.serviceDescription")}
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
                            placeholder={t("common.price")}
                            value={newItem.unit_price}
                            onChange={(e) => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                          />
                          <Button onClick={() => addInvoiceItem(selectedInvoice.id)}>
                            {t("invoicing.add")}
                          </Button>
                        </div>
                      )}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("invoicing.code")}</TableHead>
                            <TableHead>{t("invoicing.description")}</TableHead>
                            <TableHead>{t("invoicing.quantity")}</TableHead>
                            <TableHead>{t("common.price")}</TableHead>
                            <TableHead>{t("invoicing.amount")}</TableHead>
                            {selectedInvoice.status === "DRAFT" && <TableHead>{t("invoicing.action")}</TableHead>}
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
                              {selectedInvoice.status === "DRAFT" && (
                                <TableCell>
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => deleteInvoiceItem(item.id, selectedInvoice.id)}
                                   >
                                     {t("invoicing.delete")}
                                   </Button>
                                 </TableCell>
                               )}
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>

                       <div className="border-t pt-4 space-y-2">
                         <div className="flex justify-between">
                           <span>{t("invoicing.subtotal")}:</span>
                           <span>€{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between">
                           <span>{t("invoicing.vat")} (21%):</span>
                           <span>€{Number(selectedInvoice.vat).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-between font-bold text-lg">
                           <span>{t("invoicing.total")}:</span>
                           <span>€{Number(selectedInvoice.total).toFixed(2)}</span>
                         </div>
                       </div>
                     </CardContent>
                   </Card>

                   <Card>
                     <CardHeader>
                       <CardTitle>{t("invoicing.statusAndActions")}</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="flex items-center gap-2">
                         <span>{t("invoicing.currentStatus")}:</span>
                         <Badge className={statusColors[selectedInvoice.status]}>
                           {statusLabels[selectedInvoice.status]}
                         </Badge>
                       </div>

                       <div className="flex gap-2">
                         {selectedInvoice.status === "DRAFT" && (
                           <Button onClick={() => updateInvoiceStatus(selectedInvoice.id, "ISSUED")}>
                             {t("invoicing.issue")}
                           </Button>
                         )}
                         {selectedInvoice.status === "ISSUED" && (
                           <>
                              <div className="flex gap-2 items-end">
                                <div className="space-y-2 flex-1">
                                  <Label>{t("invoicing.paymentDate")}</Label>
                                  <DatePicker
                                    date={paymentDate}
                                    onSelect={setPaymentDate}
                                   placeholder={t("placeholders.selectPaymentDate")}
                                   disabled={(date) => date > new Date()}
                                  />
                                </div>
                                <Button onClick={() => markAsPaid(selectedInvoice.id)}>
                                  {t("invoicing.markAsPaid")}
                                </Button>
                              </div>
                           </>
                         )}
                         {(selectedInvoice.status === "DRAFT" || selectedInvoice.status === "ISSUED") && (
                           <Button
                             variant="destructive"
                             onClick={() => updateInvoiceStatus(selectedInvoice.id, "CANCELLED")}
                           >
                             {t("common.cancel")}
                           </Button>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 </TabsContent>
               </Tabs>
             </div>
           )}
         </DialogContent>
       </Dialog>
     </div>
   );
 }
