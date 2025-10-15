import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarOff, Plus, Trash2, Building2 } from "lucide-react";
import { nl } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export default function MortuariumInstellingen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [blockReason, setBlockReason] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgPhone, setOrgPhone] = useState("");

  // Get current user's organization
  const { data: userOrg } = useQuery({
    queryKey: ["userOrganization"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from("user_roles")
        .select("organization_id, organizations(*)")
        .eq("user_id", user.id)
        .eq("role", "mortuarium")
        .single();

      if (data?.organizations) {
        setOrgName(data.organizations.name || "");
        setOrgAddress(data.organizations.address || "");
        setOrgPhone(data.organizations.contact_phone || "");
      }

      return data;
    },
  });

  // Fetch day blocks
  const { data: dayBlocks, isLoading: loadingBlocks } = useQuery({
    queryKey: ["dayBlocks", userOrg?.organization_id],
    enabled: !!userOrg?.organization_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_day_blocks")
        .select("*")
        .eq("facility_org_id", userOrg?.organization_id)
        .order("date", { ascending: true });

      return data;
    },
  });

  // Update organization mutation
  const updateOrgMutation = useMutation({
    mutationFn: async () => {
      if (!userOrg?.organization_id) throw new Error("No organization");

      const { error } = await supabase
        .from("organizations")
        .update({
          name: orgName,
          address: orgAddress,
          contact_phone: orgPhone,
        })
        .eq("id", userOrg.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Instellingen opgeslagen",
        description: "Organisatie-instellingen zijn bijgewerkt.",
      });
      queryClient.invalidateQueries({ queryKey: ["userOrganization"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add day block mutation
  const addBlockMutation = useMutation({
    mutationFn: async () => {
      if (!userOrg?.organization_id || !selectedDate) throw new Error("Missing data");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("facility_day_blocks")
        .insert({
          facility_org_id: userOrg.organization_id,
          date: selectedDate.toISOString().split("T")[0],
          reason: blockReason || "Gesloten",
          created_by_user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sluitingsdag toegevoegd",
        description: "De dag is gemarkeerd als gesloten.",
      });
      setSelectedDate(undefined);
      setBlockReason("");
      queryClient.invalidateQueries({ queryKey: ["dayBlocks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij toevoegen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove day block mutation
  const removeBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase
        .from("facility_day_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sluitingsdag verwijderd",
        description: "De dag is niet meer gemarkeerd als gesloten.",
      });
      queryClient.invalidateQueries({ queryKey: ["dayBlocks"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const blockedDates = dayBlocks?.map((b: any) => new Date(b.date)) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-2 flex-1 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Configuratie</p>
                    <h1 className="text-2xl font-bold tracking-tight">Instellingen</h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pl-15">
                  Beheer organisatie-instellingen en sluitingsdagen
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organisatiegegevens
          </CardTitle>
          <CardDescription>
            Basisinformatie van het mortuarium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateOrgMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="orgName">Naam</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgAddress">Adres</Label>
              <Textarea
                id="orgAddress"
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgPhone">Telefoonnummer</Label>
              <Input
                id="orgPhone"
                type="tel"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={updateOrgMutation.isPending}>
              {updateOrgMutation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5" />
              Sluitingsdagen toevoegen
            </CardTitle>
            <CardDescription>
              Selecteer dagen waarop het mortuarium gesloten is
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={nl}
              className="rounded-md border pointer-events-auto"
              disabled={(date) =>
                blockedDates.some(
                  (blocked) =>
                    blocked.toISOString().split("T")[0] ===
                    date.toISOString().split("T")[0]
                )
              }
            />

            <div className="space-y-2">
              <Label htmlFor="reason">Reden (optioneel)</Label>
              <Input
                id="reason"
                placeholder={t("placeholders.holidayMaintenance")}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>

            <Button
              onClick={() => addBlockMutation.mutate()}
              disabled={!selectedDate || addBlockMutation.isPending}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addBlockMutation.isPending ? t("common.loading") : t("common.add")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geplande sluitingsdagen</CardTitle>
            <CardDescription>
              Overzicht van alle gemarkeerde sluitingsdagen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBlocks ? (
              <p className="text-muted-foreground">Laden...</p>
            ) : !dayBlocks?.length ? (
              <p className="text-muted-foreground">Geen sluitingsdagen gepland</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Reden</TableHead>
                    <TableHead className="text-right">Actie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayBlocks.map((block: any) => (
                    <TableRow key={block.id}>
                      <TableCell className="font-medium">
                        {new Date(block.date).toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{block.reason}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Sluitingsdag verwijderen?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Weet je zeker dat je deze sluitingsdag wilt
                                verwijderen? Reserveringen op deze dag worden weer
                                mogelijk.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeBlockMutation.mutate(block.id)}
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}
