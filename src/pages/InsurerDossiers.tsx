import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Shield, ShieldOff, Eye, Search, AlertCircle } from "lucide-react";

export default function InsurerDossiers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);

  const { data: userRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_roles")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .eq("role", "insurer")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: dossiers, isLoading, refetch } = useQuery({
    queryKey: ["insurer-dossiers", userRole?.organization_id],
    queryFn: async () => {
      if (!userRole?.organization_id) return [];

      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          *,
          fd_org:organizations!assigned_fd_org_id(name),
          documents(id, doc_type, status),
          claims(status, policy_number)
        `)
        .eq("insurer_org_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userRole?.organization_id,
  });

  const handleBlockDossier = async (block: boolean) => {
    if (!selectedDossier) return;

    if (block && !blockReason.trim()) {
      toast({
        title: "Fout",
        description: "Reden is verplicht voor blokkeren",
        variant: "destructive",
      });
      return;
    }

    setIsBlocking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("dossiers")
        .update({ legal_hold: block })
        .eq("id", selectedDossier.id);

      if (updateError) throw updateError;

      // Log audit event
      await supabase.from("audit_events").insert({
        user_id: user.id,
        event_type: block ? "DOSSIER_BLOCKED" : "DOSSIER_UNBLOCKED",
        target_type: "Dossier",
        target_id: selectedDossier.id,
        description: block 
          ? `Dossier geblokkeerd door verzekeraar` 
          : `Dossier gedeblokkeerd door verzekeraar`,
        reason: block ? blockReason : "Blokkering opgeheven",
        metadata: {
          dossier_ref: selectedDossier.ref_number,
          display_id: selectedDossier.display_id,
        },
      });

      // Create dossier event
      await supabase.from("dossier_events").insert({
        dossier_id: selectedDossier.id,
        event_type: block ? "LEGAL_HOLD_ENABLED" : "LEGAL_HOLD_DISABLED",
        event_description: block 
          ? `Legal hold geactiveerd: ${blockReason}` 
          : "Legal hold opgeheven",
        created_by: user.id,
        metadata: block ? { reason: blockReason } : {},
      });

      toast({
        title: "Succes",
        description: block 
          ? "Dossier is geblokkeerd" 
          : "Blokkering is opgeheven",
      });

      setBlockDialogOpen(false);
      setSelectedDossier(null);
      setBlockReason("");
      refetch();
    } catch (error) {
      console.error("Error blocking/unblocking dossier:", error);
      toast({
        title: "Fout",
        description: "Kon dossier niet bijwerken",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const filteredDossiers = dossiers?.filter(d => 
    d.deceased_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ref_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.display_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      CREATED: { label: "Aangemaakt", variant: "secondary" },
      INTAKE_COMPLETE: { label: "Intake compleet", variant: "default" },
      DOCS_PENDING: { label: "Docs pending", variant: "secondary" },
      DOCS_COMPLETE: { label: "Docs compleet", variant: "default" },
      PLANNING_CONFIRMED: { label: "Planning OK", variant: "default" },
      COMPLETED: { label: "Afgerond", variant: "default" },
    };
    const config = statusMap[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Dossiers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overzicht van alle dossiers gekoppeld aan uw organisatie
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, referentie of dossier ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {filteredDossiers.length} dossier{filteredDossiers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Dossier ID</TableHead>
                  <TableHead className="font-medium">Referentie</TableHead>
                  <TableHead className="font-medium">Overledene</TableHead>
                  <TableHead className="font-medium">Uitvaartondernemer</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Legal Hold</TableHead>
                  <TableHead className="font-medium text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDossiers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Geen dossiers gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDossiers.map((dossier) => (
                    <TableRow key={dossier.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        {dossier.display_id || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {dossier.ref_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {dossier.deceased_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {dossier.fd_org?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(dossier.status)}
                      </TableCell>
                      <TableCell>
                        {dossier.legal_hold ? (
                          <Badge variant="destructive" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Geblokkeerd
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldOff className="h-3 w-3" />
                            Actief
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/insurer/dossier/${dossier.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Bekijken
                          </Button>
                          <Button
                            size="sm"
                            variant={dossier.legal_hold ? "default" : "destructive"}
                            onClick={() => {
                              setSelectedDossier(dossier);
                              setBlockDialogOpen(true);
                            }}
                          >
                            {dossier.legal_hold ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Deblokkeer
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Blokkeer
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDossier?.legal_hold ? "Deblokkeer dossier" : "Blokkeer dossier"}
            </DialogTitle>
            <DialogDescription>
              {selectedDossier?.legal_hold 
                ? "Weet u zeker dat u de blokkering wilt opheffen?"
                : "Dit dossier wordt geblokkeerd en kan niet verder verwerkt worden."
              }
            </DialogDescription>
          </DialogHeader>

          {selectedDossier && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium">Dossier: {selectedDossier.display_id || selectedDossier.ref_number}</p>
                <p className="text-sm text-muted-foreground">Overledene: {selectedDossier.deceased_name}</p>
              </div>

              {!selectedDossier.legal_hold && (
                <div className="space-y-2">
                  <Label htmlFor="block-reason">
                    Reden voor blokkering <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="block-reason"
                    placeholder="Geef een gedetailleerde reden op voor de blokkering..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Deze actie wordt gelogd in het audit log
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBlockDialogOpen(false);
                setSelectedDossier(null);
                setBlockReason("");
              }}
              disabled={isBlocking}
            >
              Annuleren
            </Button>
            <Button
              variant={selectedDossier?.legal_hold ? "default" : "destructive"}
              onClick={() => handleBlockDossier(!selectedDossier?.legal_hold)}
              disabled={isBlocking}
            >
              {isBlocking ? "Bezig..." : selectedDossier?.legal_hold ? "Deblokkeer" : "Blokkeer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
