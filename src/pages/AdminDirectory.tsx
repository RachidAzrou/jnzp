import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Building2, CheckCircle, XCircle, AlertCircle, Search 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  type: string;
  verification_status: string;
  contact_email?: string;
  contact_phone?: string;
  city?: string;
  created_at: string;
}

export default function AdminDirectory() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [organizations, searchQuery, typeFilter, statusFilter]);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon organisaties niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrganizations = () => {
    let filtered = [...organizations];

    if (searchQuery) {
      filtered = filtered.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter) {
      filtered = filtered.filter((org) => org.type === typeFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((org) => org.verification_status === statusFilter);
    }

    setFilteredOrgs(filtered);
  };

  const handleVerify = async (orgId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("organizations")
        .update({
          verification_status: "ACTIVE",
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq("id", orgId);

      if (error) throw error;

      // Log the action
      await supabase.rpc("log_admin_action", {
        p_action: "ORG_VERIFY",
        p_target_type: "Organization",
        p_target_id: orgId,
      });

      toast({
        title: "Geverifieerd",
        description: "Organisatie is geverifieerd",
      });

      fetchOrganizations();
    } catch (error) {
      console.error("Error verifying organization:", error);
      toast({
        title: "Fout",
        description: "Kon organisatie niet verifiëren",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ verification_status: "INACTIVE" })
        .eq("id", orgId);

      if (error) throw error;

      await supabase.rpc("log_admin_action", {
        p_action: "ORG_DEACTIVATE",
        p_target_type: "Organization",
        p_target_id: orgId,
      });

      toast({
        title: "Gedeactiveerd",
        description: "Organisatie is gedeactiveerd",
      });

      fetchOrganizations();
    } catch (error) {
      console.error("Error deactivating organization:", error);
      toast({
        title: "Fout",
        description: "Kon organisatie niet deactiveren",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-success"><CheckCircle className="mr-1 h-3 w-3" />Actief</Badge>;
      case "INACTIVE":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Inactief</Badge>;
      case "PENDING_VERIFICATION":
        return <Badge variant="secondary"><AlertCircle className="mr-1 h-3 w-3" />Ter controle</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FD: "Uitvaartondernemer",
      MOSQUE: "Moskee",
      WASPLAATS: "Wasplaats",
      INSURER: "Verzekeraar",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-muted-foreground">Laden...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Directory Beheer
          </h1>
          <p className="text-muted-foreground">Beheer organisaties, locaties en contacten</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, stad, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={typeFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(null)}
            >
              Alle types
            </Button>
            <Button
              variant={typeFilter === "FD" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("FD")}
            >
              Uitvaartondernemers
            </Button>
            <Button
              variant={typeFilter === "MOSQUE" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("MOSQUE")}
            >
              Moskeeën
            </Button>
            <Button
              variant={typeFilter === "WASPLAATS" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("WASPLAATS")}
            >
              Wasplaatsen
            </Button>
            <Button
              variant={typeFilter === "INSURER" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("INSURER")}
            >
              Verzekeraars
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(null)}
            >
              Alle statussen
            </Button>
            <Button
              variant={statusFilter === "ACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Actief
            </Button>
            <Button
              variant={statusFilter === "PENDING_VERIFICATION" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PENDING_VERIFICATION")}
            >
              Ter controle
            </Button>
            <Button
              variant={statusFilter === "INACTIVE" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactief
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organisaties ({filteredOrgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stad</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{getTypeLabel(org.type)}</TableCell>
                  <TableCell>{getStatusBadge(org.verification_status)}</TableCell>
                  <TableCell>{org.city || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {org.contact_email && <div>{org.contact_email}</div>}
                    {org.contact_phone && <div className="text-muted-foreground">{org.contact_phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {org.verification_status === "PENDING_VERIFICATION" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleVerify(org.id)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Verifiëren
                        </Button>
                      )}
                      {org.verification_status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(org.id)}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Deactiveren
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
