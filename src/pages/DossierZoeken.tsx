import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";

interface SearchResult {
  id: string;
  display_id: string;
  flow: string;
  status: string;
  assignment_status: string;
  deceased_name: string | null;
  assigned_fd_org_id: string | null;
}

export default function DossierZoeken() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [claiming, setClaiming] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Voer een dossiernummer in");
      return;
    }

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: searchError } = await supabase
        .from("dossiers")
        .select("id, display_id, flow, status, assignment_status, deceased_name, assigned_fd_org_id")
        .eq("display_id", searchQuery.trim().toUpperCase())
        .maybeSingle();

      if (searchError) throw searchError;

      if (!data) {
        setError("Geen dossier gevonden met dit nummer");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError("Fout bij zoeken: " + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleClaim = async () => {
    if (!result) return;

    setClaiming(true);
    try {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRoles?.organization_id) {
        throw new Error("Geen organisatie gevonden");
      }

      const { error: claimError } = await supabase
        .from("dossier_claims")
        .insert({
          dossier_id: result.id,
          requesting_org_id: userRoles.organization_id,
          requested_by: (await supabase.auth.getUser()).data.user?.id,
          reason: claimReason || null,
        });

      if (claimError) throw claimError;

      toast.success("Claim ingediend. Familie ontvangt een bevestigingsverzoek.");
      setClaimDialogOpen(false);
      setResult(null);
      setSearchQuery("");
      setClaimReason("");
    } catch (err: any) {
      console.error("Claim error:", err);
      toast.error("Fout bij claimen: " + err.message);
    } finally {
      setClaiming(false);
    }
  };

  const maskName = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length === 1) return name.charAt(0) + ". " + name.slice(1);
    return parts[0].charAt(0) + ". " + parts.slice(1).join(" ");
  };

  return (
    <>
      <TopBar />
      
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Dossier zoeken</h1>
          <p className="text-muted-foreground">Zoek en claim beschikbare dossiers</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Dossier opzoeken
            </CardTitle>
            <CardDescription>
              Zoek een dossier op basis van dossiernummer (bijv. LOC-000001 of REP-000001)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="LOC-000001 of REP-000001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? "Zoeken..." : "Zoeken"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {result.display_id}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {result.flow === "LOC" ? "Lokaal" : "Repatriëring"}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {result.assignment_status === "UNASSIGNED" && result.deceased_name
                      ? maskName(result.deceased_name)
                      : "Beperkte informatie beschikbaar"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.assignment_status === "UNASSIGNED" && (
                    <>
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Dit dossier is momenteel niet gekoppeld aan een uitvaartonderneming.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={() => setClaimDialogOpen(true)} className="w-full">
                        Dossier claimen
                      </Button>
                    </>
                  )}
                  
                  {result.assignment_status === "ASSIGNED" && result.assigned_fd_org_id && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Dit dossier is gekoppeld aan een andere uitvaartonderneming.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {result.assignment_status === "PENDING_CLAIM" && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Er is een claim in behandeling. Wachten op familiebevestiging.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dossier claimen</DialogTitle>
            <DialogDescription>
              U gaat een claimverzoek indienen voor dossier {result?.display_id}. 
              De familie ontvangt een bevestigingsverzoek via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivering (optioneel)
              </label>
              <Textarea
                placeholder="Waarom wilt u dit dossier overnemen?"
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? "Indienen..." : "Claim indienen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
