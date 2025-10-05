import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Search, Trash2, Save, Send, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { pdf } from '@react-pdf/renderer';
import { InvoicePDF, InvoiceData } from "@/components/InvoicePDF";
import { calculateInvoiceAmounts, validateInvoiceData } from "@/lib/invoiceCalculations";

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
  needs_info_reason: string | null;
  dossiers: {
    ref_number: string;
    deceased_name: string;
    display_id: string;
    insurer_org_id: string | null;
  };
  organizations?: {
    name: string;
  };
};

type InvoiceItem = {
  id?: string;
  code: string;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
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

type Dossier = {
  id: string;
  ref_number: string;
  deceased_name: string;
  display_id: string;
  insurer_org_id: string | null;
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
  APPROVED: "Goedgekeurd",
  PAID: "Betaald",
  CANCELLED: "Geannuleerd",
};

export default function FDFacturatie() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [insurerFilter, setInsurerFilter] = useState("all");

  // Generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<string>("");
  const [invoiceLines, setInvoiceLines] = useState<InvoiceItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
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
        .eq("fd_org_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch dossiers for dropdown
      const { data: dossiersData, error: dossiersError } = await supabase
        .from("dossiers")
        .select("id, ref_number, deceased_name, display_id, insurer_org_id")
        .eq("assigned_fd_org_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (dossiersError) throw dossiersError;
      setDossiers(dossiersData || []);

      // Fetch catalog items
      const { data: catalogData, error: catalogError } = await supabase
        .from("catalog_items")
        .select("*")
        .eq("organization_id", userRole.organization_id)
        .eq("is_active", true)
        .order("code");

      if (catalogError) throw catalogError;
      setCatalogItems(catalogData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addCatalogItemToInvoice = (item: CatalogItem) => {
    const newLine: InvoiceItem = {
      code: item.code,
      description: item.name,
      qty: 1,
      unit_price: Number(item.default_price),
      amount: Number(item.default_price),
    };
    setInvoiceLines([...invoiceLines, newLine]);
  };

  const addCustomLine = () => {
    if (!customCode || !customDescription) {
      toast({
        title: "Fout",
        description: "Code en omschrijving zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    const newLine: InvoiceItem = {
      code: customCode,
      description: customDescription,
      qty: customQty,
      unit_price: customPrice,
      amount: customQty * customPrice,
    };
    setInvoiceLines([...invoiceLines, newLine]);
    setCustomCode("");
    setCustomDescription("");
    setCustomQty(1);
    setCustomPrice(0);
  };

  const updateLine = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceLines];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "qty" || field === "unit_price") {
      updated[index].amount = Number(updated[index].qty) * Number(updated[index].unit_price);
    }
    
    setInvoiceLines(updated);
  };

  const removeLine = (index: number) => {
    setInvoiceLines(invoiceLines.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + Number(line.amount), 0);
    const vat = subtotal * 0.21;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const generateInvoiceData = async (): Promise<InvoiceData | null> => {
    if (!selectedDossier) return null;

    const { data: dossier } = await supabase
      .from("dossiers")
      .select("*, insurer:organizations!dossiers_insurer_org_id_fkey(*)")
      .eq("id", selectedDossier)
      .single();

    if (!dossier) return null;

    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoiceData: InvoiceData = {
      fd: {
        name: "Al-Baraka Uitvaartzorg",
        vat: "BE0123.456.789",
        address: "Kerkstraat 12\n1000 Brussel\nBelgië",
        contact: "info@al-baraka.be | +32 2 123 45 67",
        iban: "BE12 3456 7890 1234",
        bic: "ABCDBEBB",
      },
      insurer: {
        name: dossier.insurer?.name || "",
        address: dossier.insurer?.address || "",
        contact: dossier.insurer?.contact_email || "",
      },
      invoice: {
        number: `TEMP-${Date.now()}`,
        date: today,
        due_date: dueDate.toISOString().split('T')[0],
        currency: "EUR",
        payment_terms_days: 14,
        notes: null,
      },
      dossier: {
        display_id: dossier.display_id || "",
        deceased_name: dossier.deceased_name,
        flow_type: dossier.flow === "REP" ? "Repatriëring" : "Lokaal",
        policy_ref: dossier.ref_number,
      },
      items: invoiceLines.map(line => ({
        code: line.code,
        description: line.description,
        qty: line.qty,
        unit: "stuk",
        unit_price_ex_vat: line.unit_price / 1.21,
        discount_pct: 0,
        vat_pct: 21,
      })),
    };

    return calculateInvoiceAmounts(invoiceData);
  };

  const handleDownloadPDF = async () => {
    try {
      const invoiceData = await generateInvoiceData();
      if (!invoiceData) {
        toast({
          title: "Fout",
          description: "Kon factuurgegevens niet ophalen",
          variant: "destructive",
        });
        return;
      }

      const validation = validateInvoiceData(invoiceData);
      if (!validation.valid) {
        toast({
          title: "Validatiefout",
          description: validation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }

      const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `factuur-${invoiceData.invoice.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Succes",
        description: "PDF gegenereerd en gedownload",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Fout",
        description: "Kon PDF niet genereren",
        variant: "destructive",
      });
    }
  };

  const saveInvoice = async (asDraft: boolean) => {
    if (!selectedDossier) {
      toast({
        title: "Fout",
        description: "Selecteer een dossier",
        variant: "destructive",
      });
      return;
    }

    if (invoiceLines.length === 0) {
      toast({
        title: "Fout",
        description: "Voeg minimaal één factuurregel toe",
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
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      const dossier = dossiers.find(d => d.id === selectedDossier);
      if (!dossier?.insurer_org_id) {
        toast({
          title: "Fout",
          description: "Dit dossier heeft geen verzekeraar",
          variant: "destructive",
        });
        return;
      }

      const { subtotal, vat, total } = calculateTotals();

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          dossier_id: selectedDossier,
          fd_org_id: userRole.organization_id,
          facility_org_id: userRole.organization_id,
          status: asDraft ? "DRAFT" : "ISSUED",
          subtotal,
          vat,
          total,
          issued_at: asDraft ? null : new Date().toISOString(),
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Add invoice items
      const items = invoiceLines.map(line => ({
        invoice_id: invoice.id,
        code: line.code,
        description: line.description,
        qty: Number(line.qty),
        unit_price: Number(line.unit_price),
        amount: Number(line.amount),
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({
        title: "Succes",
        description: asDraft ? "Factuur opgeslagen als concept" : "Factuur uitgegeven",
      });

      setShowGenerator(false);
      setSelectedDossier("");
      setInvoiceLines([]);
      fetchData();
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.dossiers?.ref_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.dossiers?.deceased_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredCatalog = catalogItems.filter(item =>
    item.code.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const { subtotal, vat, total } = calculateTotals();

  if (loading) {
    return (
      <div className="p-6">Laden...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Facturatie</h1>
          <p className="text-muted-foreground mt-1">Beheer facturen voor verzekeraars</p>
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Factuur
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoeken op nummer, dossier, overledene..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="DRAFT">Concept</SelectItem>
                <SelectItem value="ISSUED">Te accorderen</SelectItem>
                <SelectItem value="NEEDS_INFO">Info nodig</SelectItem>
                <SelectItem value="APPROVED">Goedgekeurd</SelectItem>
                <SelectItem value="PAID">Betaald</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
          <CardHeader>
            <CardTitle>Facturen Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr</TableHead>
                  <TableHead>Dossier</TableHead>
                  <TableHead>Overledene</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number || "-"}</TableCell>
                    <TableCell>{invoice.dossiers?.display_id}</TableCell>
                    <TableCell>{invoice.dossiers?.deceased_name}</TableCell>
                    <TableCell>
                      {new Date(invoice.created_at).toLocaleDateString("nl-NL")}
                    </TableCell>
                    <TableCell className="text-right">€{Number(invoice.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[invoice.status]}>
                        {statusLabels[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost">
                        <FileText className="h-4 w-4 mr-1" />
                        Bekijken
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Geen facturen gevonden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
      </Card>

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Factuur Generator</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Dossier Selection */}
              <div className="space-y-2">
                <Label>Dossier *</Label>
                <Select value={selectedDossier} onValueChange={setSelectedDossier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer dossier" />
                  </SelectTrigger>
                  <SelectContent>
                    {dossiers.map((dossier) => (
                      <SelectItem key={dossier.id} value={dossier.id}>
                        {dossier.display_id} - {dossier.deceased_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="catalog">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="catalog">Catalogus</TabsTrigger>
                  <TabsTrigger value="custom">Custom Regel</TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Zoek in catalogus..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead className="text-right">Prijs</TableHead>
                          <TableHead>Actie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCatalog.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.code}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">€{Number(item.default_price).toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addCatalogItemToInvoice(item)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Toevoegen
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code *</Label>
                      <Input
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                        placeholder="Bijv. CUSTOM_001"
                      />
                    </div>
                    <div>
                      <Label>Omschrijving *</Label>
                      <Input
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Beschrijving van dienst"
                      />
                    </div>
                    <div>
                      <Label>Aantal</Label>
                      <Input
                        type="number"
                        min="1"
                        value={customQty}
                        onChange={(e) => setCustomQty(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Prijs per stuk</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button onClick={addCustomLine}>
                    <Plus className="h-4 w-4 mr-2" />
                    Voeg toe aan factuur
                  </Button>
                </TabsContent>
              </Tabs>

              {/* Invoice Lines */}
              <Card>
                <CardHeader>
                  <CardTitle>Factuurlijnen</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Prijs</TableHead>
                        <TableHead>Bedrag</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{line.code}</TableCell>
                          <TableCell>{line.description}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => updateLine(index, "qty", Number(e.target.value))}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(e) => updateLine(index, "unit_price", Number(e.target.value))}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>€{Number(line.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeLine(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {invoiceLines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Geen regels toegevoegd
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {invoiceLines.length > 0 && (
                    <div className="mt-4 border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotaal:</span>
                        <span>€{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BTW (21%):</span>
                        <span>€{vat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Totaal:</span>
                        <span>€{total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGenerator(false)}>
                Annuleren
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => saveInvoice(true)}>
                <Save className="h-4 w-4 mr-2" />
                Opslaan als Concept
              </Button>
              <Button onClick={() => saveInvoice(false)}>
                <Send className="h-4 w-4 mr-2" />
                Uitgeven
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}