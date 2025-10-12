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
import { FlightPlanningDialog } from "@/components/planning/FlightPlanningDialog";
import { EditMortuariumReservationDialog } from "@/components/planning/EditMortuariumReservationDialog";
import { EditFlightDialog } from "@/components/planning/EditFlightDialog";
import { MoskeeServiceDialog } from "@/components/planning/MoskeeServiceDialog";

const Planning = () => {
  const { t } = useTranslation();
  const [wasplaatsServices, setWasplaatsServices] = useState<any[]>([]);
  const [mosqueServices, setMosqueServices] = useState<any[]>([]);
  const [repatriations, setRepatriations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDossier, setSearchDossier] = useState("");
  const [searchName, setSearchName] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mortuariumDialogOpen, setMortuariumDialogOpen] = useState(false);
  const [moskeeDialogOpen, setMoskeeDialogOpen] = useState(false);
  const [flightDialogOpen, setFlightDialogOpen] = useState(false);
  const [editMortuariumDialogOpen, setEditMortuariumDialogOpen] = useState(false);
  const [editFlightDialogOpen, setEditFlightDialogOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string>("");
  const [selectedFlightId, setSelectedFlightId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

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

      // Fetch mosque services
      const { data: mosqueData, error: mosqueError } = await supabase
        .from("case_events")
        .select(`
          *,
          dossier:dossiers!inner(
            display_id,
            deceased_name
          )
        `)
        .eq("event_type", "MOSQUE_SERVICE")
        .order("scheduled_at", { ascending: true });

      if (wasplaatsError) throw wasplaatsError;
      if (mosqueError) throw mosqueError;

      // Fetch repatriations (flight planning preferences)
      const { data: repatriationsData, error: repatriationsError } = await supabase
        .from("repatriations")
        .select(`
          *,
          dossier:dossiers!inner(
            display_id,
            deceased_name
          )
        `)
        .order("created_at", { ascending: false });

      if (repatriationsError) throw repatriationsError;

      // Transform data to match component expectations
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

      const transformedMosque = (mosqueData || []).map(service => ({
        id: service.id,
        dossier_ref: service.dossier?.display_id,
        deceased_name: service.dossier?.deceased_name,
        location: service.location_text,
        scheduled_at: service.scheduled_at,
        status: service.status,
        notes: service.notes
      }));

      const transformedRepatriations = (repatriationsData || []).map(rep => ({
        id: rep.id,
        dossier_ref: rep.dossier?.display_id,
        deceased_name: rep.dossier?.deceased_name,
        dest_country: rep.dest_country,
        dest_city: rep.dest_city,
        dest_address: rep.dest_address,
        created_at: rep.created_at
      }));

      setWasplaatsServices(transformedWasplaats);
      setMosqueServices(transformedMosque);
      setRepatriations(transformedRepatriations);
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

  const filteredWasplaatsServices = filterBySearch(wasplaatsServices);
  const filteredMosqueServices = filterBySearch(mosqueServices);
  const filteredRepatriations = filterBySearch(repatriations);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      {/* Header */}
      <Card className="mb-6 animate-fade-in shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {t("planning.title")}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filter Section */}
      <Card className="shadow-md bg-card/50 backdrop-blur-sm mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

      <div className="grid gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {/* Mortuarium Services Section - FIRST */}
        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
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
        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PiMosque className="h-5 w-5 text-muted-foreground" />
                  Moskee Planning
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={() => setMoskeeDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe Afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMosqueServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Geen moskee afspraken gepland</p>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier</TableHead>
                      <TableHead>Naam</TableHead>
                      <TableHead>Locatie</TableHead>
                      <TableHead>Gepland op</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMosqueServices.map((service) => (
                      <TableRow key={service.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium font-mono text-sm">
                          {service.dossier_ref}
                        </TableCell>
                        <TableCell className="text-sm">{service.deceased_name}</TableCell>
                        <TableCell className="text-sm">{service.location || "Niet opgegeven"}</TableCell>
                        <TableCell className="text-sm">
                          {service.scheduled_at ? format(new Date(service.scheduled_at), "dd/MM/yyyy HH:mm", { locale: nl }) : "Niet gepland"}
                        </TableCell>
                        <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flights Section - THIRD */}
        <Card className="shadow-md bg-card/50 backdrop-blur-sm">
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
            {filteredRepatriations.length === 0 ? (
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
                    <TableHead>Bestemming</TableHead>
                    <TableHead>Aangemaakt</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRepatriations.map((rep) => (
                    <TableRow key={rep.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium font-mono text-sm">
                        {rep.dossier_ref}
                      </TableCell>
                      <TableCell className="text-sm">{rep.deceased_name}</TableCell>
                      <TableCell className="text-sm">
                        {rep.dest_city}, {rep.dest_country}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(rep.created_at), "dd/MM/yyyy", { locale: nl })}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">{t("common.view")}</Button>
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
      <MoskeeServiceDialog
        open={moskeeDialogOpen}
        onOpenChange={setMoskeeDialogOpen}
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
