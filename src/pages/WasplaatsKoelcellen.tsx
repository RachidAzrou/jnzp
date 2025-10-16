import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, XCircle, CheckCircle2, Unlock, Refrigerator, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { CoolCellCalendarView } from "@/components/wasplaats/CoolCellCalendarView";

type CoolCell = {
  id: string;
  label: string;
  status: string;
  out_of_service_note: string | null;
};

const statusColors: Record<string, string> = {
  FREE: "bg-green-600 text-white border-0",
  RESERVED: "bg-orange-600 text-white border-0",
  OCCUPIED: "bg-red-600 text-white border-0",
  OUT_OF_SERVICE: "bg-gray-600 text-white border-0",
};

const statusLabels: Record<string, string> = {
  FREE: "Vrij",
  RESERVED: "Gereserveerd",
  OCCUPIED: "Bezet",
  OUT_OF_SERVICE: "Buiten Dienst",
};

export default function WasplaatsKoelcellen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coolCells, setCoolCells] = useState<CoolCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCellLabel, setNewCellLabel] = useState("");
  const [bulkCount, setBulkCount] = useState("1");
  const [bulkPrefix, setBulkPrefix] = useState("");

  useEffect(() => {
    fetchCoolCells();
  }, []);

  const fetchCoolCells = async () => {
    try {
      const { data, error } = await supabase
        .from("cool_cells")
        .select("*")
        .order("label");

      if (error) throw error;
      if (data) setCoolCells(data);
    } catch (error) {
      console.error("Error fetching cool cells:", error);
      toast({
        title: "Fout",
        description: "Kon koelcellen niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCellStatus = async (cellId: string, newStatus: "FREE" | "RESERVED" | "OCCUPIED" | "OUT_OF_SERVICE") => {
    try {
      const { error } = await supabase
        .from("cool_cells")
        .update({ status: newStatus })
        .eq("id", cellId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Status bijgewerkt",
      });

      fetchCoolCells();
    } catch (error) {
      console.error("Error updating cell status:", error);
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const addCoolCell = async () => {
    const count = parseInt(bulkCount) || 1;
    
    if (count < 1 || count > 50) {
      toast({
        title: "Fout",
        description: "Aantal moet tussen 1 en 50 zijn",
        variant: "destructive",
      });
      return;
    }

    if (!bulkPrefix.trim() && count > 1) {
      toast({
        title: "Fout",
        description: "Voer een prefix in voor bulk toevoegen",
        variant: "destructive",
      });
      return;
    }

    if (count === 1 && !newCellLabel.trim() && !bulkPrefix.trim()) {
      toast({
        title: "Fout",
        description: "Voer een label in",
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
        .eq("role", "mortuarium")
        .single();

      if (!userRole?.organization_id) throw new Error("Geen organisatie gevonden");

      const cellsToInsert = [];
      
      if (count === 1) {
        cellsToInsert.push({
          label: newCellLabel.trim() || bulkPrefix.trim(),
          facility_org_id: userRole.organization_id,
          status: "FREE",
        });
      } else {
        for (let i = 1; i <= count; i++) {
          cellsToInsert.push({
            label: `${bulkPrefix.trim()} ${i}`,
            facility_org_id: userRole.organization_id,
            status: "FREE",
          });
        }
      }

      const { error } = await supabase
        .from("cool_cells")
        .insert(cellsToInsert);

      if (error) throw error;

      toast({
        title: "Succes",
        description: count === 1 ? "Koelcel toegevoegd" : `${count} koelcellen toegevoegd`,
      });

      setNewCellLabel("");
      setBulkPrefix("");
      setBulkCount("1");
      setIsAddDialogOpen(false);
      fetchCoolCells();
    } catch (error) {
      console.error("Error adding cool cell:", error);
      toast({
        title: "Fout",
        description: "Kon koelcel(len) niet toevoegen",
        variant: "destructive",
      });
    }
  };

  const deleteCoolCell = async (cellId: string) => {
    if (!confirm("Weet u zeker dat u deze koelcel wilt verwijderen?")) return;

    try {
      const { error } = await supabase
        .from("cool_cells")
        .delete()
        .eq("id", cellId);

      if (error) throw error;

      toast({
        title: "Succes",
        description: "Koelcel verwijderd",
      });

      fetchCoolCells();
    } catch (error) {
      console.error("Error deleting cool cell:", error);
      toast({
        title: "Fout",
        description: "Kon koelcel niet verwijderen",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Refrigerator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Faciliteiten</p>
                  <h1 className="text-2xl font-bold tracking-tight">Koelcellen Beheer</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                Beheer koelcellen en hun status
              </p>
            </div>
          </CardContent>
        </Card>


        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Kalender Weergave
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <Refrigerator className="h-4 w-4" />
              Lijst Weergave
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <CoolCellCalendarView />
          </TabsContent>
          
          <TabsContent value="list" className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Overzicht</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-sm">Cel</th>
                        <th className="text-left p-3 font-medium text-sm">Status</th>
                        <th className="text-left p-3 font-medium text-sm">Notitie</th>
                        <th className="text-left p-3 font-medium text-sm">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coolCells.map((cell) => (
                        <tr key={cell.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium text-sm">{cell.label}</td>
                          <td className="p-3">
                            <Badge className={statusColors[cell.status] || ""}>
                              {statusLabels[cell.status] || cell.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {cell.out_of_service_note || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCellStatus(cell.id, "FREE")}
                                disabled={cell.status === "FREE"}
                                className="gap-1"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs">Vrij</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCellStatus(cell.id, "OCCUPIED")}
                                disabled={cell.status === "OCCUPIED"}
                                className="gap-1"
                              >
                                <Unlock className="h-4 w-4" />
                                <span className="text-xs">Bezet</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCellStatus(cell.id, "OUT_OF_SERVICE")}
                                disabled={cell.status === "OUT_OF_SERVICE"}
                                className="gap-1"
                              >
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">Buiten Dienst</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteCoolCell(cell.id)}
                                className="gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs">Verwijder</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
