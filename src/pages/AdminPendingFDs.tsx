import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Building2, Mail, Phone, MapPin } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingFD {
  id: string;
  company_name: string | null;
  legal_name: string | null;
  business_number: string | null;
  email: string | null;
  phone: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  address_street: string | null;
  address_postcode: string | null;
  address_city: string | null;
  address_country: string | null;
  created_at: string;
  status: string | null;
}

export default function AdminPendingFDs() {
  const [pendingFDs, setPendingFDs] = useState<PendingFD[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFD, setSelectedFD] = useState<PendingFD | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    loadPendingFDs();
  }, []);

  const loadPendingFDs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("type", "FUNERAL_DIRECTOR")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingFDs((data as any) || []);
    } catch (error: any) {
      console.error("Error loading pending FDs:", error);
      toast.error("Fout bij laden van pending FD's");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (fd: PendingFD, actionType: "approve" | "reject") => {
    setSelectedFD(fd);
    setAction(actionType);
  };

  const confirmAction = async () => {
    if (!selectedFD || !action) return;

    setActionLoading(selectedFD.id);
    try {
      const newStatus = action === "approve" ? "active" : "rejected";

      const { error } = await supabase
        .from("organizations")
        .update({
          status: newStatus,
          is_verified: action === "approve",
          verification_status: action === "approve" ? "APPROVED" : "REJECTED",
        })
        .eq("id", selectedFD.id);

      if (error) throw error;

      // Mark related notification as read
      await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("related_id", selectedFD.id)
        .eq("related_type", "organization");

      toast.success(
        action === "approve"
          ? "FD succesvol goedgekeurd"
          : "FD succesvol geweigerd"
      );

      loadPendingFDs();
    } catch (error: any) {
      console.error("Error updating FD status:", error);
      toast.error("Fout bij bijwerken van FD status");
    } finally {
      setActionLoading(null);
      setSelectedFD(null);
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pending FD Goedkeuringen</h1>
        <p className="text-muted-foreground mt-2">
          Beoordeel en keur nieuwe uitvaartondernemers goed
        </p>
      </div>

      {pendingFDs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Geen pending FD's gevonden</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingFDs.map((fd) => (
            <Card key={fd.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold">{fd.company_name}</h3>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{fd.legal_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Ondernemingsnummer: {fd.business_number}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Contactpersoon</h4>
                      <div className="space-y-1 text-sm">
                        <p>{fd.contact_first_name} {fd.contact_last_name}</p>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{fd.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{fd.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Adres</h4>
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <div>
                          <p>{fd.address_street}</p>
                          <p>{fd.address_postcode} {fd.address_city}</p>
                          <p>{fd.address_country}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Aangemaakt: {new Date(fd.created_at).toLocaleString("nl-NL")}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction(fd, "approve")}
                    disabled={actionLoading === fd.id}
                  >
                    {actionLoading === fd.id && action === "approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Goedkeuren
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction(fd, "reject")}
                    disabled={actionLoading === fd.id}
                  >
                    {actionLoading === fd.id && action === "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Weigeren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!selectedFD} onOpenChange={() => setSelectedFD(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "approve" ? "FD Goedkeuren" : "FD Weigeren"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "approve"
                ? `Weet je zeker dat je ${selectedFD?.company_name} wilt goedkeuren? De FD krijgt volledige toegang tot het platform.`
                : `Weet je zeker dat je ${selectedFD?.company_name} wilt weigeren? Deze actie kan niet ongedaan worden gemaakt.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
