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

const Planning = () => {
  const { t } = useTranslation();
  const [mosqueServices, setMosqueServices] = useState<any[]>([]);
  const [wasplaatsServices, setWasplaatsServices] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDossier, setSearchDossier] = useState("");
  const [searchName, setSearchName] = useState("");
  const [showFilters, setShowFilters] = useState(false);
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
        scheduled_at: service.start_at,
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
        <h1 className="text-2xl font-semibold">Planning</h1>
      </div>

      {/* Filter Section */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek op dossier nummer of naam..."
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
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Mosque Services Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PiMosque className="h-5 w-5 text-muted-foreground" />
                  Moskee Planning
                </CardTitle>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMosqueServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Geen moskee ceremonies gepland</p>
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

        {/* Mortuarium Services Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MdOutlineShower className="h-5 w-5 text-muted-foreground" />
                  Mortuarium Planning
                </CardTitle>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredWasplaatsServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Geen mortuarium afspraken gepland</p>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Locatie</TableHead>
                    <TableHead>Datum & Tijd</TableHead>
                    <TableHead>Koelcel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notities</TableHead>
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
                      <TableCell className="text-sm">{formatDateTime(service.scheduled_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{service.cool_cell}</Badge>
                      </TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {service.notes || "-"}
                      </TableCell>
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

        {/* Flights Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  Vlucht Planning
                </CardTitle>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe vlucht
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFlights.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Geen vluchten gepland</p>
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
    </div>
  );
};

export default Planning;
