import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter } from "lucide-react";

const Dossiers = () => {
  const dossiers = [
    { id: "A12", naam: "El Mansouri, Fatima", status: "In behandeling", land: "Marokko", created: "2025-09-28", deadline: "2025-10-02", documenten: "3/5" },
    { id: "A13", naam: "Yildirim, Mehmet", status: "Legal hold", land: "Turkije", created: "2025-09-27", deadline: "2025-10-01", documenten: "5/5" },
    { id: "A11", naam: "Hassan, Ahmed", status: "Compleet", land: "Egypte", created: "2025-09-26", deadline: "2025-09-30", documenten: "5/5" },
    { id: "A10", naam: "Al-Farsi, Khadija", status: "In behandeling", land: "Marokko", created: "2025-09-25", deadline: "2025-09-29", documenten: "4/5" },
    { id: "A09", naam: "Özdemir, Ayşe", status: "Goedgekeurd", land: "Turkije", created: "2025-09-24", deadline: "2025-09-28", documenten: "5/5" },
    { id: "A08", naam: "Ibrahim, Omar", status: "In behandeling", land: "Syrië", created: "2025-09-23", deadline: "2025-09-27", documenten: "2/5" },
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Compleet":
      case "Goedgekeurd":
        return "default";
      case "Legal hold":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground mt-1">Beheer alle repatriëringsdossiers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nieuw dossier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Zoek op naam, dossier nr, land..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dossier</TableHead>
                <TableHead>Naam overledene</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bestemmingsland</TableHead>
                <TableHead>Aangemaakt</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Documenten</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dossiers.map((dossier) => (
                <TableRow key={dossier.id}>
                  <TableCell className="font-medium">{dossier.id}</TableCell>
                  <TableCell>{dossier.naam}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(dossier.status)}>
                      {dossier.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{dossier.land}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dossier.created}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dossier.deadline}</TableCell>
                  <TableCell>
                    <span className={dossier.documenten === "5/5" ? "text-success font-medium" : "text-warning font-medium"}>
                      {dossier.documenten}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Details</Button>
                      <Button variant="ghost" size="sm">Bewerken</Button>
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
};

export default Dossiers;
