import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type IntegrationStatus = "operational" | "degraded" | "down";

interface Integration {
  id: string;
  name: string;
  status: IntegrationStatus;
  lastSync: string;
  errorCount: number;
  provider: string;
}

const statusConfig = {
  operational: {
    label: "Operationeel",
    icon: CheckCircle2,
    color: "text-green-500",
    variant: "default" as const,
  },
  degraded: {
    label: "Verslechterd",
    icon: AlertCircle,
    color: "text-yellow-500",
    variant: "secondary" as const,
  },
  down: {
    label: "Down",
    icon: XCircle,
    color: "text-red-500",
    variant: "destructive" as const,
  },
};

const mockIntegrations: Integration[] = [
  {
    id: "1",
    name: "Mawaqit API",
    status: "operational",
    lastSync: new Date().toISOString(),
    errorCount: 0,
    provider: "MAWAQIT",
  },
  {
    id: "2",
    name: "WhatsApp Business API",
    status: "operational",
    lastSync: new Date().toISOString(),
    errorCount: 0,
    provider: "WHATSAPP",
  },
  {
    id: "3",
    name: "Insurer API (AG Insurance)",
    status: "operational",
    lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    errorCount: 2,
    provider: "INSURER_API",
  },
];

export function IntegrationHealthPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const handleTestConnection = (integration: Integration) => {
    setSelectedIntegration(integration);
    setTestDialogOpen(true);
  };

  const handleRunTest = () => {
    // In real implementation, this would call an edge function to test the connection
    console.log("Testing connection for:", selectedIntegration?.name);
    setTestDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integratie Health Monitor</h2>
        <p className="text-muted-foreground">
          Bekijk de status van externe integraties en test connecties
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const config = statusConfig[integration.status];
          const StatusIcon = config.icon;

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <CardDescription>{integration.provider}</CardDescription>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${config.color}`} aria-label={config.label} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Laatste sync:</span>
                  <span className="text-sm">
                    {new Date(integration.lastSync).toLocaleTimeString("nl-NL")}
                  </span>
                </div>

                {integration.errorCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Errors (24u):</span>
                    <Badge variant="destructive">{integration.errorCount}</Badge>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTestConnection(integration)}
                >
                  <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                  Test Connectie
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Connectie: {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Test de connectie met deze externe integratie. Dit kan tot 30 seconden duren.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Endpoint</Label>
              <Input
                value={`https://api.${selectedIntegration?.provider.toLowerCase()}.com`}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Test Parameters (optioneel)</Label>
              <Textarea placeholder='{"timeout": 5000}' rows={3} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleRunTest}>
                <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                Start Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
