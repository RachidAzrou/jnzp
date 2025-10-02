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
import { Calendar, Plane, Building2, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const Planning = () => {
  const [janazServices, setJanazServices] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: servicesData }, { data: flightsData }] = await Promise.all([
      supabase
        .from("janaz_services")
        .select("*, dossiers(ref_number, deceased_name)")
        .order("service_date", { ascending: true }),
      supabase
        .from("flights")
        .select("*, repatriations(dossiers(ref_number, deceased_name))")
        .order("depart_at", { ascending: true })
    ]);

    setJanazServices(servicesData || []);
    setFlights(flightsData || []);
    setLoading(false);
  };

  const getServiceStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: "secondary",
      CONFIRMED: "default",
      COMPLETED: "default",
      FAILED: "destructive"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy HH:mm", { locale: nl });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planning</h1>
        <p className="text-muted-foreground mt-1">Overzicht van moskee ceremonies en vluchten</p>
      </div>

      <div className="grid gap-6">
        {/* Mosque Services Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Moskee/Wasplaats Planning
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe afspraak
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {janazServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Geen moskee afspraken gepland
              </div>
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
                  {janazServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium font-mono">
                        {service.dossiers?.ref_number}
                      </TableCell>
                      <TableCell>{service.dossiers?.deceased_name}</TableCell>
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

        {/* Flights Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Vlucht Planning
              </CardTitle>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe vlucht
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {flights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Geen vluchten gepland
              </div>
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
                  {flights.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell className="font-medium font-mono">
                        {flight.repatriations?.dossiers?.ref_number}
                      </TableCell>
                      <TableCell>{flight.repatriations?.dossiers?.deceased_name}</TableCell>
                      <TableCell>{flight.carrier}</TableCell>
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
