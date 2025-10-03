import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, XCircle, CheckCircle2, Unlock } from "lucide-react";
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
        .eq("role", "wasplaats")
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Koelcellen Beheer</h1>
          <p className="text-muted-foreground mt-1">Beheer koelcellen en hun status</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Koelcel Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Koelcel(len)</DialogTitle>
              <DialogDescription>
                Voeg één of meerdere koelcellen toe aan uw mortuarium.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="count">Aantal koelcellen</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="50"
                  placeholder="1"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Voer aantal in (1-50)
                </p>
              </div>
              
              {parseInt(bulkCount) > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    placeholder="bijv. Cel, A, B"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Labels worden: {bulkPrefix || "Prefix"} 1, {bulkPrefix || "Prefix"} 2, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="label">Label / Nummer</Label>
                  <Input
                    id="label"
                    placeholder="Bijv. Cel 1, A1, etc."
                    value={newCellLabel}
                    onChange={(e) => setNewCellLabel(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setNewCellLabel("");
                setBulkPrefix("");
                setBulkCount("1");
              }}>
                Annuleren
              </Button>
              <Button onClick={addCoolCell}>
                {parseInt(bulkCount) > 1 ? `${bulkCount} Koelcellen Toevoegen` : "Toevoegen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Cel</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Notitie</th>
                  <th className="text-left p-3">Acties</th>
                </tr>
              </thead>
              <tbody>
                {coolCells.map((cell) => (
                  <tr key={cell.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{cell.label}</td>
                    <td className="p-3">
                      <Badge className={statusColors[cell.status] || ""}>
                        {statusLabels[cell.status] || cell.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {cell.out_of_service_note || "-"}
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
    </div>
  );
}
