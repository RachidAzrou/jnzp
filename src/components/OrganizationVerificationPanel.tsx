import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type VerificationStatus = "pending" | "verified" | "rejected";

interface Organization {
  id: string;
  name: string;
  type: string;
  verificationStatus: VerificationStatus;
  registrationNumber?: string;
  address?: string;
  contactEmail?: string;
  requestedAt: string;
}

const statusConfig = {
  pending: {
    label: "In Afwachting",
    icon: Clock,
    color: "text-yellow-500",
    variant: "secondary" as const,
  },
  verified: {
    label: "Geverifieerd",
    icon: CheckCircle2,
    color: "text-green-500",
    variant: "default" as const,
  },
  rejected: {
    label: "Afgewezen",
    icon: XCircle,
    color: "text-red-500",
    variant: "destructive" as const,
  },
};

const mockOrganizations: Organization[] = [
  {
    id: "1",
    name: "Uitvaartzorg Vreedzaam",
    type: "funeral_director",
    verificationStatus: "pending",
    registrationNumber: "KVK 12345678",
    address: "Hoofdstraat 123, 1000 AA Amsterdam",
    contactEmail: "info@vreedzaam.nl",
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "2",
    name: "Al-Iman Moskee",
    type: "mosque",
    verificationStatus: "pending",
    address: "Moskeestraat 45, 2000 AB Rotterdam",
    contactEmail: "admin@aliman.nl",
    requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function OrganizationVerificationPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>(mockOrganizations);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  const handleVerify = (org: Organization) => {
    setSelectedOrg(org);
    setVerifyDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedOrg) return;

    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === selectedOrg.id
          ? { ...org, verificationStatus: "verified" as VerificationStatus }
          : org
      )
    );

    toast({
      title: "Organisatie Geverifieerd",
      description: `${selectedOrg.name} is succesvol geverifieerd.`,
    });

    setVerifyDialogOpen(false);
    setSelectedOrg(null);
  };

  const handleReject = () => {
    if (!selectedOrg || !rejectionReason.trim()) {
      toast({
        title: "Reden Vereist",
        description: "Geef een reden voor afwijzing op.",
        variant: "destructive",
      });
      return;
    }

    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === selectedOrg.id
          ? { ...org, verificationStatus: "rejected" as VerificationStatus }
          : org
      )
    );

    toast({
      title: "Organisatie Afgewezen",
      description: `${selectedOrg.name} is afgewezen.`,
      variant: "destructive",
    });

    setVerifyDialogOpen(false);
    setSelectedOrg(null);
    setRejectionReason("");
  };

  const pendingCount = organizations.filter((org) => org.verificationStatus === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organisatie Verificatie</h2>
          <p className="text-muted-foreground">
            Beheer en verifieer nieuwe organisatie registraties
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            <AlertTriangle className="h-4 w-4 mr-2" aria-hidden="true" />
            {pendingCount} in afwachting
          </Badge>
        )}
      </div>

      <div className="grid gap-4">
        {organizations.map((org) => {
          const config = statusConfig[org.verificationStatus];
          const StatusIcon = config.icon;

          return (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <CardTitle>{org.name}</CardTitle>
                    </div>
                    <CardDescription>
                      Type: {org.type === "funeral_director" ? "Uitvaartzorg" : "Moskee"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-5 w-5 ${config.color}`} aria-label={config.label} />
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {org.registrationNumber && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">KVK Nummer:</span>
                    <span className="font-medium">{org.registrationNumber}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Adres:</span>
                  <span className="font-medium text-right max-w-[60%]">{org.address}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">{org.contactEmail}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aangevraagd:</span>
                  <span className="font-medium">
                    {new Date(org.requestedAt).toLocaleDateString("nl-NL")}
                  </span>
                </div>

                {org.verificationStatus === "pending" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleVerify(org)}
                  >
                    Verifiëren
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifieer Organisatie</DialogTitle>
            <DialogDescription>
              Controleer de gegevens en keur de organisatie goed of af.
            </DialogDescription>
          </DialogHeader>

          {selectedOrg && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Naam:</span>
                  <span>{selectedOrg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span>
                    {selectedOrg.type === "funeral_director" ? "Uitvaartzorg" : "Moskee"}
                  </span>
                </div>
                {selectedOrg.registrationNumber && (
                  <div className="flex justify-between">
                    <span className="font-medium">KVK:</span>
                    <span>{selectedOrg.registrationNumber}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Reden voor afwijzing (optioneel bij goedkeuring)
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Geef een reden indien u deze organisatie afwijst..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button variant="destructive" onClick={handleReject}>
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Afwijzen
                </Button>
                <Button onClick={handleApprove}>
                  <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Goedkeuren
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
