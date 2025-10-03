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
import { Calendar, Plane, Plus, Search } from "lucide-react";
import { MdOutlineShower, MdOutlineMosque } from "react-icons/md";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Mock data for demonstration
const mockMosqueServices = [
  {
    id: "m1",
    dossier_ref: "A009",
    deceased_name: "Mohammed Aziz",
    mosque_name: "El Noor Moskee",
    service_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
    status: "CONFIRMED",
    notes: "Familie verwacht 50+ personen"
  },
  {
    id: "m2",
    dossier_ref: "A014",
    deceased_name: "Aisha Rachid",
    mosque_name: "Tawheed Moskee",
    service_date: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // tomorrow
    status: "PENDING",
    notes: "Bevestiging afwachten"
  }
];

const mockWasplaatsServices = [
  {
    id: "w1",
    dossier_ref: "A007",
    deceased_name: "Amina Radi",
    facility_name: "Mortuarium Amsterdam",
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 hours
    status: "CONFIRMED",
    cool_cell: "Cel 3",
    notes: "Rituele wassing door familie"
  },
  {
    id: "w2",
    dossier_ref: "A012",
    deceased_name: "Hassan El-Mansouri",
    facility_name: "Mortuarium Rotterdam",
    scheduled_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // +6 hours
    status: "PENDING",
    cool_cell: "Cel 1",
    notes: ""
  }
];

const mockFlights = [
  {
    id: "f1",
    dossier_ref: "A010",
    deceased_name: "Omar Ziani",
    carrier: "Turkish Airlines",
    flight_number: "TK1952",
    depart_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // +12 hours
    arrive_at: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(), // +16 hours
    reservation_ref: "TK-9384KL",
    air_waybill: "235-8847-2931"
  },
  {
    id: "f2",
    dossier_ref: "A008",
    deceased_name: "Karima Benali",
    carrier: "Royal Air Maroc",
    flight_number: "AT725",
    depart_at: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // day after tomorrow
    arrive_at: new Date(Date.now() + 39 * 60 * 60 * 1000).toISOString(),
    reservation_ref: "RAM-7721QP",
    air_waybill: ""
  }
];

const Planning = () => {
  const [mosqueServices, setMosqueServices] = useState<any[]>([]);
  const [wasplaatsServices, setWasplaatsServices] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDossier, setSearchDossier] = useState("");
  const [searchName, setSearchName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // For MVP, use mock data to demonstrate the UI
    // In production, fetch from Supabase
    setTimeout(() => {
      setMosqueServices(mockMosqueServices);
      setWasplaatsServices(mockWasplaatsServices);
      setFlights(mockFlights);
      setLoading(false);
    }, 500);
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
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Planning</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Overzicht van moskee ceremonies en vluchten</p>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op dossier nummer..."
                  value={searchDossier}
                  onChange={(e) => setSearchDossier(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam overledene..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {(searchDossier || searchName) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchDossier("");
                  setSearchName("");
                }}
                className="w-full sm:w-auto"
              >
                Reset filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Mosque Services Section */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MdOutlineMosque className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  Moskee Planning
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Geplande ceremonies in moskeeën</p>
              </div>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Nieuwe moskee afspraak</span>
                <span className="sm:hidden">Nieuwe afspraak</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMosqueServices.length === 0 ? (
              <EmptyState
                icon={MdOutlineMosque}
                title="Geen moskee ceremonies"
                description="Er zijn momenteel geen moskee ceremonies gepland. Klik op 'Nieuwe moskee afspraak' om de eerste te plannen."
                action={{
                  label: "Nieuwe afspraak maken",
                  onClick: () => toast({ title: "Functie komt binnenkort" })
                }}
              />
            ) : (
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
                    <TableRow key={service.id}>
                      <TableCell className="font-medium font-mono">
                        {service.dossier_ref}
                      </TableCell>
                      <TableCell>{service.deceased_name}</TableCell>
                      <TableCell>{service.mosque_name}</TableCell>
                      <TableCell>{formatDateTime(service.service_date)}</TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {service.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Mortuarium Services Section */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MdOutlineShower className="h-5 w-5 text-primary" />
                  </div>
                  Mortuarium Planning
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Geplande rituele wassingen</p>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe mortuarium afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredWasplaatsServices.length === 0 ? (
              <EmptyState
                icon={MdOutlineShower}
                title="Geen mortuarium afspraken"
                description="Er zijn nog geen mortuarium afspraken gepland. Voeg een afspraak toe wanneer de wassing gepland moet worden."
                action={{
                  label: "Afspraak maken",
                  onClick: () => toast({ title: "Functie komt binnenkort" })
                }}
              />
            ) : (
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
                    <TableRow key={service.id}>
                      <TableCell className="font-medium font-mono">
                        {service.dossier_ref}
                      </TableCell>
                      <TableCell>{service.deceased_name}</TableCell>
                      <TableCell>{service.facility_name}</TableCell>
                      <TableCell>{formatDateTime(service.scheduled_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.cool_cell}</Badge>
                      </TableCell>
                      <TableCell>{getServiceStatusBadge(service.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {service.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Flights Section */}
        <Card>
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  Vlucht Planning
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Geplande repatriëringsvluchten</p>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe vlucht
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredFlights.length === 0 ? (
              <EmptyState
                icon={Plane}
                title="Geen vluchten gepland"
                description="Er zijn nog geen vluchten geregistreerd voor repatriëringen. Voeg een vlucht toe wanneer de planning gereed is."
                action={{
                  label: "Vlucht registreren",
                  onClick: () => toast({ title: "Functie komt binnenkort" })
                }}
              />
            ) : (
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
                    <TableRow key={flight.id}>
                      <TableCell className="font-medium font-mono">
                        {flight.dossier_ref}
                      </TableCell>
                      <TableCell>{flight.deceased_name}</TableCell>
                      <TableCell>
                        <div>{flight.carrier}</div>
                        <div className="text-xs text-muted-foreground">{flight.flight_number}</div>
                      </TableCell>
                      <TableCell>{formatDateTime(flight.depart_at)}</TableCell>
                      <TableCell>{formatDateTime(flight.arrive_at)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {flight.reservation_ref}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {flight.air_waybill || "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Details</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Planning;
