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
import { Search, Upload, Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

const Documenten = () => {
  const documents = [
    { id: 1, dossier: "A12", naam: "Attest van overlijden (IIIC)", status: "goedgekeurd", uploadDate: "2025-09-28 10:30", uploadedBy: "J. Serrai", size: "1.2 MB" },
    { id: 2, dossier: "A12", naam: "Identiteitsbewijs overledene", status: "afgewezen", uploadDate: "2025-09-28 11:15", uploadedBy: "J. Serrai", size: "850 KB", reason: "Onleesbaar" },
    { id: 3, dossier: "A13", naam: "Parketvrijgave", status: "in_behandeling", uploadDate: "2025-09-27 14:20", uploadedBy: "M. Haddad", size: "2.1 MB" },
    { id: 4, dossier: "A13", naam: "Laissez-passer aanvraag", status: "goedgekeurd", uploadDate: "2025-09-27 09:45", uploadedBy: "M. Haddad", size: "650 KB" },
    { id: 5, dossier: "A11", naam: "Medisch attest", status: "goedgekeurd", uploadDate: "2025-09-26 16:30", uploadedBy: "J. Serrai", size: "980 KB" },
    { id: 6, dossier: "A10", naam: "Verzekeringspolis", status: "in_behandeling", uploadDate: "2025-09-25 13:10", uploadedBy: "Systeem", size: "1.5 MB" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "afgewezen":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "goedgekeurd":
        return <Badge variant="default" className="bg-success">Goedgekeurd</Badge>;
      case "afgewezen":
        return <Badge variant="destructive">Afgewezen</Badge>;
      default:
        return <Badge variant="secondary">In behandeling</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documenten</h1>
          <p className="text-muted-foreground mt-1">Beheer en controleer alle dossier documenten</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Document uploaden
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totaal documenten</p>
                <p className="text-2xl font-bold mt-1">47</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goedgekeurd</p>
                <p className="text-2xl font-bold mt-1 text-success">38</p>
              </div>
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In behandeling</p>
                <p className="text-2xl font-bold mt-1 text-warning">9</p>
              </div>
              <Clock className="h-12 w-12 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Zoek op naam, dossier, type..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Dossier</TableHead>
                <TableHead>Document naam</TableHead>
                <TableHead>Upload datum</TableHead>
                <TableHead>Geüpload door</TableHead>
                <TableHead>Grootte</TableHead>
                <TableHead>Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.status)}
                      {getStatusBadge(doc.status)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium font-mono">{doc.dossier}</TableCell>
                  <TableCell>
                    {doc.naam}
                    {doc.reason && (
                      <p className="text-xs text-destructive mt-1">Reden: {doc.reason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.uploadDate}</TableCell>
                  <TableCell className="text-sm">{doc.uploadedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
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

export default Documenten;
