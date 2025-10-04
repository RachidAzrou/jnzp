import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Check, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type MosqueService = {
  id: string;
  dossier_id: string;
  requested_date: string | null;
  prayer: string | null;
  status: string;
  note: string | null;
  decline_reason: string | null;
  created_at: string;
  dossiers: {
    ref_number: string;
    display_id: string | null;
    deceased_name: string;
    date_of_death: string | null;
  };
};

const prayerLabels: Record<string, string> = {
  FAJR: "Fajr",
  DHUHR: "Dhuhr",
  ASR: "Asr",
  MAGHRIB: "Maghrib",
  ISHA: "Isha",
  JUMUAH: "Jumu'ah",
};

const statusLabels: Record<string, string> = {
  PENDING: "Wachtend",
  OPEN: "Wachtend",
  CONFIRMED: "Bevestigd",
  DECLINED: "Geweigerd",
  PROPOSED: "Voorstel",
};

export default function MoskeeAanvragen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [services, setServices] = useState<MosqueService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [prayerFilter, setPrayerFilter] = useState<string>("ALL");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<MosqueService | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("mosque_services")
        .select("*, dossiers(ref_number, display_id, deceased_name, date_of_death)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setServices(data as any);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Fout",
        description: "Kon aanvragen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (serviceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const { error } = await supabase
        .from("mosque_services")
        .update({ status: "CONFIRMED" })
        .eq("id", serviceId);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.confirm",
        user_id: session.user.id,
        dossier_id: service.dossier_id,
        description: `Moskee bevestigde janāza-gebed voor ${service.dossiers.deceased_name}`,
        metadata: {
          mosque_service_id: serviceId,
          prayer: service.prayer,
          requested_date: service.requested_date,
        },
      });

      toast({
        title: "✅ Bevestigd",
        description: "Aanvraag is bevestigd",
      });

      fetchServices();
    } catch (error) {
      console.error("Error confirming service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet bevestigen",
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (service: MosqueService) => {
    setSelectedService(service);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedService || !rejectReason || rejectReason.trim().length < 8) {
      toast({
        title: "Fout",
        description: "Reden is verplicht (minimaal 8 tekens)",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("mosque_services")
        .update({
          status: "DECLINED",
          decline_reason: rejectReason.trim(),
        })
        .eq("id", selectedService.id);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_events").insert({
        event_type: "mosque.decline",
        user_id: session.user.id,
        dossier_id: selectedService.dossier_id,
        description: `Moskee wees janāza-gebed af voor ${selectedService.dossiers.deceased_name}`,
        metadata: {
          mosque_service_id: selectedService.id,
          decline_reason: rejectReason.trim(),
          prayer: selectedService.prayer,
          requested_date: selectedService.requested_date,
        },
      });

      toast({
        title: "❌ Geweigerd",
        description: "Aanvraag is afgewezen met reden",
      });

      setRejectDialogOpen(false);
      setSelectedService(null);
      setRejectReason("");
      fetchServices();
    } catch (error) {
      console.error("Error declining service:", error);
      toast({
        title: "Fout",
        description: "Kon aanvraag niet afwijzen",
        variant: "destructive",
      });
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      searchTerm === "" ||
      service.dossiers.display_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.dossiers.ref_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "OPEN" && (service.status === "PENDING" || service.status === "OPEN")) ||
      service.status === statusFilter;

    const matchesPrayer =
      prayerFilter === "ALL" || service.prayer === prayerFilter;

    return matchesSearch && matchesStatus && matchesPrayer;
  });

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Moskee Aanvragen</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beheer alle binnengekomen janāza-aanvragen
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op dossier-ID of naam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle statussen</SelectItem>
                <SelectItem value="OPEN">Openstaand</SelectItem>
                <SelectItem value="CONFIRMED">Bevestigd</SelectItem>
                <SelectItem value="DECLINED">Geweigerd</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prayerFilter} onValueChange={setPrayerFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Gebed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Alle gebeden</SelectItem>
                <SelectItem value="FAJR">Fajr</SelectItem>
                <SelectItem value="DHUHR">Dhuhr</SelectItem>
                <SelectItem value="ASR">Asr</SelectItem>
                <SelectItem value="MAGHRIB">Maghrib</SelectItem>
                <SelectItem value="ISHA">Isha</SelectItem>
                <SelectItem value="JUMUAH">Jumu'ah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Aanvragen Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            Aanvragenlijst ({filteredServices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Geen aanvragen gevonden</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium text-sm">Ontvangen</TableHead>
                    <TableHead className="font-medium text-sm">Dossier</TableHead>
                    <TableHead className="font-medium text-sm">Overledene</TableHead>
                    <TableHead className="font-medium text-sm">Gebed</TableHead>
                    <TableHead className="font-medium text-sm">Datum</TableHead>
                    <TableHead className="font-medium text-sm">Status</TableHead>
                    <TableHead className="font-medium text-sm">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(service.created_at), "dd/MM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {service.dossiers.display_id || service.dossiers.ref_number}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {service.dossiers.deceased_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {service.prayer ? prayerLabels[service.prayer] : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {service.requested_date
                          ? format(new Date(service.requested_date), "dd MMM", { locale: nl })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[service.status] || service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {(service.status === "PENDING" || service.status === "OPEN") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConfirm(service.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Bevestig
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectClick(service)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Weiger
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/moskee/aanvraag/${service.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Bekijk
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-700 dark:text-red-300">
              Aanvraag weigeren
            </DialogTitle>
            <DialogDescription>
              Geef een reden op waarom deze aanvraag niet mogelijk is (minimaal 8 tekens).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reden (minimaal 8 tekens)
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Bijvoorbeeld: Overmacht (brandalarm), Sluiting i.v.m. Eid-gebed, Geen imam beschikbaar..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {rejectReason.length}/8 tekens minimaal
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setSelectedService(null);
                setRejectReason("");
              }}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectReason.trim().length < 8}
            >
              Bevestig afwijzing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
