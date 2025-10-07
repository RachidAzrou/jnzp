import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Plane, Plus, Search, SlidersHorizontal } from "lucide-react";
import { MdOutlineShower } from "react-icons/md";
import { PiMosque } from "react-icons/pi";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { MortuariumReservationDialog } from "@/components/planning/MortuariumReservationDialog";
import { MosqueServiceDialog } from "@/components/planning/MosqueServiceDialog";
import { FlightPlanningDialog } from "@/components/planning/FlightPlanningDialog";
import { EditMortuariumReservationDialog } from "@/components/planning/EditMortuariumReservationDialog";
import { EditMosqueServiceDialog } from "@/components/planning/EditMosqueServiceDialog";
import { EditFlightDialog } from "@/components/planning/EditFlightDialog";

const Planning = () => {
  const { t } = useTranslation();
  const [mosqueServices, setMosqueServices] = useState<any[]>([]);
  const [wasplaatsServices, setWasplaatsServices] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDossier, setSearchDossier] = useState("");
  const [searchName, setSearchName] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mortuariumDialogOpen, setMortuariumDialogOpen] = useState(false);
  const [mosqueDialogOpen, setMosqueDialogOpen] = useState(false);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [editMortuariumDialogOpen, setEditMortuariumDialogOpen] = useState(false);
  const [editMosqueDialogOpen, setEditMosqueDialogOpen] = useState(false);
  const [editFlightDialogOpen, setEditFlightDialogOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch mosque services with dossier info
      const { data: mosqueData, error: mosqueError } = await supabase
        .from("janaz_services")
        .select(`
          *,
          dossier:dossiers!inner(
            display_id,
            deceased_name
          )
        `)
        .order("service_date", { ascending: true });

      if (mosqueError) throw mosqueError;

      // Fetch wasplaats/mortuarium reservations with dossier info
      const { data: wasplaatsData, error: wasplaatsError } = await supabase
        .from("cool_cell_reservations")
        .select(`
          *,
          dossier:dossiers!inner(
            display_id,
            deceased_name
          ),
          cool_cell:cool_cells(
            label
          ),
          facility:organizations!cool_cell_reservations_facility_org_id_fkey(
            name
          )
        `)
        .order("start_at", { ascending: true });

      if (wasplaatsError) throw wasplaatsError;

      // Fetch flights with repatriation and dossier info
      const { data: flightsData, error: flightsError } = await supabase
        .from("flights")
        .select(`
          *,
          repatriation:repatriations!inner(
            dossier:dossiers!inner(
              display_id,
              deceased_name
            )
          )
        `)
        .order("depart_at", { ascending: true });

      if (flightsError) throw flightsError;

      // Transform data to match component expectations
      const transformedMosque = (mosqueData || []).map(service => ({
        id: service.id,
        dossier_ref: service.dossier?.display_id,
        deceased_name: service.dossier?.deceased_name,
        mosque_name: service.mosque_name,
        service_date: service.service_date,
        status: service.status,
        notes: service.notes
      }));

      const transformedWasplaats = (wasplaatsData || []).map(service => ({
        id: service.id,
        dossier_ref: service.dossier?.display_id,
        deceased_name: service.dossier?.deceased_name,
        facility_name: service.facility?.name,
        start_at: service.start_at,
        end_at: service.end_at,
        status: service.status,
        cool_cell: service.cool_cell?.label,
        notes: service.note
      }));

      const transformedFlights = (flightsData || []).map(flight => ({
        id: flight.id,
        dossier_ref: flight.repatriation?.dossier?.display_id,
        deceased_name: flight.repatriation?.dossier?.deceased_name,
        carrier: flight.carrier,
        flight_number: flight.carrier, // You may need to add flight_number to the flights table
        depart_at: flight.depart_at,
        arrive_at: flight.arrive_at,
        reservation_ref: flight.reservation_ref,
        air_waybill: flight.air_waybill
      }));

      setMosqueServices(transformedMosque);
      setWasplaatsServices(transformedWasplaats);
      setFlights(transformedFlights);
    } catch (error: any) {
      console.error("Error fetching planning data:", error);
      toast({
        title: "Fout bij ophalen planning",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: "secondary",
      CONFIRMED: "default",
      COMPLETED: "default",
      FAILED: "destructive"
    };
    const labels: Record<string, string> = {
      PENDING: "In afwachting",
      CONFIRMED: "Bevestigd",
      COMPLETED: "Voltooid",
      FAILED: "Mislukt"
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  // Filter functions
  const filterBySearch = (items: any[]) => {
    return items.filter(item => {
      const matchesDossier = !searchDossier || 
        item.dossier_ref?.toLowerCase().includes(searchDossier.toLowerCase());
      const matchesName = !searchName || 
        item.deceased_name?.toLowerCase().includes(searchName.toLowerCase());
      return matchesDossier && matchesName;
    });
  };

  const filteredMosqueServices = filterBySearch(mosqueServices);
  const filteredWasplaatsServices = filterBySearch(wasplaatsServices);
  const filteredFlights = filterBySearch(flights);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("planning.title")}</h1>
      </div>

      {/* Filter Section */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("planning.searchPlaceholder")}
                  value={searchDossier}
                onChange={(e) => {
                  setSearchDossier(e.target.value);
                  setSearchName(e.target.value);
                }}
                className="pl-10 bg-background"
              />
            </div>
            {(searchDossier || searchName) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchDossier("");
                  setSearchName("");
                }}
              >
                {t("common.reset")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Mortuarium Services Section - FIRST */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MdOutlineShower className="h-5 w-5 text-muted-foreground" />
                  {t("planning.mortuariumPlanning")}
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMortuariumDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("planning.newAppointment")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredWasplaatsServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("planning.noMortuariumAppointments")}</p>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Van</TableHead>
                    <TableHead>Tot</TableHead>
                    <TableHead>Koelcel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWasplaatsServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium font-mono text-sm">
                        {service.dossier_ref}
                      </TableCell>
                      <TableCell className="text-sm">{service.deceased_name}</TableCell>
                      <TableCell className="text-sm">{service.facility_name}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(service.start_at), "dd/MM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(service.end_at), "dd/MM HH:mm", { locale: nl })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{service.cool_cell}</Badge>
                      </TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedReservationId(service.id);
                            setEditMortuariumDialogOpen(true);
                          }}
                        >
                          {t("common.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Mosque Services Section - SECOND */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PiMosque className="h-5 w-5 text-muted-foreground" />
                  {t("planning.mosquePlanning")}
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMosqueDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMosqueServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("planning.noMosqueCeremonies")}</p>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Moskee</TableHead>
                    <TableHead>Datum & Tijd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notities</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMosqueServices.map((service) => (
                    <TableRow key={service.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium font-mono text-sm">
                        {service.dossier_ref}
                      </TableCell>
                      <TableCell className="text-sm">{service.deceased_name}</TableCell>
                      <TableCell className="text-sm">{service.mosque_name}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(service.service_date)}</TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {service.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setEditMosqueDialogOpen(true);
                          }}
                        >
                          {t("common.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Flights Section - THIRD */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  {t("planning.flightPlanning")}
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setFlightDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("planning.newFlight")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFlights.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("planning.noFlights")}</p>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Maatschappij</TableHead>
                    <TableHead>Vertrek</TableHead>
                    <TableHead>Aankomst</TableHead>
                    <TableHead>Reservering</TableHead>
                    <TableHead>AWB</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlights.map((flight) => (
                    <TableRow key={flight.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium font-mono text-sm">
                        {flight.dossier_ref}
                      </TableCell>
                      <TableCell className="text-sm">{flight.deceased_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{flight.carrier}</div>
                        <div className="text-xs text-muted-foreground">{flight.flight_number}</div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDateTime(flight.depart_at)}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(flight.arrive_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {flight.reservation_ref}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {flight.air_waybill || "-"}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedFlightId(flight.id);
                            setEditFlightDialogOpen(true);
                          }}
                        >
                          {t("common.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <MortuariumReservationDialog
        open={mortuariumDialogOpen}
        onOpenChange={setMortuariumDialogOpen}
        onSuccess={fetchData}
      />
      <MosqueServiceDialog
        open={mosqueDialogOpen}
        onOpenChange={setMosqueDialogOpen}
        onSuccess={fetchData}
      />
      <FlightPlanningDialog
        open={flightDialogOpen}
        onOpenChange={setFlightDialogOpen}
        onSuccess={fetchData}
      />
      
      {/* Edit Dialogs */}
      {selectedReservationId && (
        <EditMortuariumReservationDialog
          open={editMortuariumDialogOpen}
          onOpenChange={setEditMortuariumDialogOpen}
          reservationId={selectedReservationId}
          onSuccess={fetchData}
        />
      )}
      {selectedServiceId && (
        <EditMosqueServiceDialog
          open={editMosqueDialogOpen}
          onOpenChange={setEditMosqueDialogOpen}
          serviceId={selectedServiceId}
          onSuccess={fetchData}
        />
      )}
      {selectedFlightId && (
        <EditFlightDialog
          open={editFlightDialogOpen}
          onOpenChange={setEditFlightDialogOpen}
          flightId={selectedFlightId}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default Planning;
