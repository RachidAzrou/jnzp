import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type CoolCell = {
  id: string;
  label: string;
  status: string;
  out_of_service_note: string | null;
};

const statusColors: Record<string, string> = {
  FREE: "bg-success text-success-foreground",
  RESERVED: "bg-warning text-warning-foreground",
  OCCUPIED: "bg-primary text-primary-foreground",
  OUT_OF_SERVICE: "bg-destructive text-destructive-foreground",
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

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/wasplaats")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Koelcellenbeheer</h1>
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
                      <div className="flex gap-2">
                        {cell.status === "FREE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCellStatus(cell.id, "OUT_OF_SERVICE")}
                          >
                            Zet Buiten Dienst
                          </Button>
                        )}
                        {cell.status === "OUT_OF_SERVICE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCellStatus(cell.id, "FREE")}
                          >
                            Zet Vrij
                          </Button>
                        )}
                        {cell.status === "OCCUPIED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCellStatus(cell.id, "FREE")}
                          >
                            Markeer Released
                          </Button>
                        )}
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
