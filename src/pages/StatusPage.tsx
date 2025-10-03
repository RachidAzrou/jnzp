import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

const COMPONENTS = [
  { name: "API", status: "operational" as const },
  { name: "Database", status: "operational" as const },
  { name: "Chat Services", status: "operational" as const },
  { name: "Mawaqit Integration", status: "operational" as const },
  { name: "WhatsApp Integration", status: "operational" as const },
];

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">JanazApp Status</h1>
          <p className="text-muted-foreground">Systeem status overzicht</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <CardTitle>Alle Systemen Operationeel</CardTitle>
                  <CardDescription>Laatste update: {new Date().toLocaleString("nl-NL")}</CardDescription>
                </div>
              </div>
              <Badge>Operationeel</Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Componenten</h2>
          <Card>
            <CardContent className="p-0">
              {COMPONENTS.map((component, index) => (
                <div key={component.name}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <p className="font-medium">{component.name}</p>
                    </div>
                    <Badge>Operationeel</Badge>
                  </div>
                  {index < COMPONENTS.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
