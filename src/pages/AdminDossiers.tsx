import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type DossierStatus = Database["public"]["Enums"]["simple_dossier_status"];
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderOpen, Search, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Dossier {
  id: string;
  display_id: string;
  deceased_name: string;
  status: string;
  flow: string;
  created_at: string;
  legal_hold: boolean;
}

export default function AdminDossiers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [filteredDossiers, setFilteredDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [overrideType, setOverrideType] = useState<"status" | "unlock" | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [newStatus, setNewStatus] = useState<any>("created");

  useEffect(() => {
    fetchDossiers();
  }, []);

  useEffect(() => {
    filterDossiers();
  }, [dossiers, searchQuery, statusFilter]);

  const fetchDossiers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dossiers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDossiers(data || []);
    } catch (error) {
      console.error("Error fetching dossiers:", error);
      toast({
        title: "Fout bij ophalen",
        description: "Kon dossiers niet ophalen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDossiers = () => {
    let filtered = dossiers;

    if (searchQuery) {
      filtered = filtered.filter(
        (d) =>
          d.display_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.deceased_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    setFilteredDossiers(filtered);
  };

  const handleOverride = (dossier: Dossier, type: "status" | "unlock") => {
    setSelectedDossier(dossier);
    setOverrideType(type);
    setOverrideReason("");
    setNewStatus(dossier.status as DossierStatus);
  };

  const confirmOverride = async () => {
    if (!selectedDossier || !overrideType) return;

    if (!overrideReason.trim()) {
      toast({
        title: "Reden verplicht",
        description: "Geef een reden op voor deze override",
        variant: "destructive",
      });
      return;
    }

    try {
      if (overrideType === "status") {
        const { error } = await supabase
          .from("dossiers")
          .update({ status: newStatus })
          .eq("id", selectedDossier.id);

        if (error) throw error;
      } else if (overrideType === "unlock") {
        const { error } = await supabase
          .from("dossiers")
          .update({ legal_hold: false })
          .eq("id", selectedDossier.id);

        if (error) throw error;
      }

      await supabase.rpc("log_admin_action", {
        p_action: overrideType === "status" ? "DOSSIER_STATUS_OVERRIDE" : "DOSSIER_UNLOCKED",
        p_target_type: "Dossier",
        p_target_id: selectedDossier.id,
        p_reason: overrideReason,
      });

      toast({
        title: "Override uitgevoerd",
        description: `Dossier ${overrideType === "status" ? "status aangepast" : "ontgrendeld"}`,
      });

      setSelectedDossier(null);
      setOverrideType(null);
      setOverrideReason("");
      fetchDossiers();
    } catch (error) {
      console.error("Error performing override:", error);
      toast({
        title: "Fout",
        description: "Kon override niet uitvoeren",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      CREATED: { label: "Nieuw dossier", className: "bg-yellow-600 hover:bg-yellow-700 text-white border-0" },
      IN_PROGRESS: { label: "In behandeling", className: "bg-green-600 hover:bg-green-700 text-white border-0" },
      UNDER_REVIEW: { label: "In controle", className: "bg-emerald-600 hover:bg-emerald-700 text-white border-0" },
      COMPLETED: { label: "Operationeel afgerond", className: "bg-cyan-600 hover:bg-cyan-700 text-white border-0" },
      CLOSED: { label: "Gearchiveerd", className: "bg-gray-600 hover:bg-gray-700 text-white border-0" },
    };
    const variant = variants[status] || { label: status, className: "" };
    return <Badge className={`text-xs ${variant.className}`}>{variant.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          Dossiers (Admin)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only inzage + nood-overrides
        </p>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.dossiers.searchFilter")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("placeholders.searchIdName")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="CREATED">Nieuw dossier</SelectItem>
                <SelectItem value="IN_PROGRESS">In behandeling</SelectItem>
                <SelectItem value="UNDER_REVIEW">In controle</SelectItem>
                <SelectItem value="COMPLETED">Operationeel afgerond</SelectItem>
                <SelectItem value="CLOSED">Gearchiveerd</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dossiers Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">{t("admin.dossiers.dossiersCount")} ({filteredDossiers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium text-sm">{t("common.id")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.name")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.status")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.flow")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.created")}</TableHead>
                <TableHead className="font-medium text-sm">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDossiers.map((dossier) => (
                <TableRow key={dossier.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">
                    {dossier.display_id || dossier.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {dossier.deceased_name}
                    {dossier.legal_hold && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Legal Hold
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(dossier.status)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{dossier.flow}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(dossier.created_at).toLocaleDateString("nl-NL")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/dossiers/${dossier.id}`)}
                      >
                        Bekijken
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOverride(dossier, "status")}
                      >
                        Status reset
                      </Button>
                      {dossier.legal_hold && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => handleOverride(dossier, "unlock")}
                        >
                          Unlock
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Override Dialog */}
      <Dialog open={!!selectedDossier} onOpenChange={() => {
        setSelectedDossier(null);
        setOverrideType(null);
        setOverrideReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overrideType === "status" ? "Status Override" : "Dossier Unlocked"}
            </DialogTitle>
            <DialogDescription>
              Deze actie wordt gelogd in de audit log. Geef een reden op.
            </DialogDescription>
          </DialogHeader>
          {overrideType === "status" && (
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as DossierStatus)}>
              <SelectTrigger>
                <SelectValue placeholder={t("placeholders.newStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREATED">Nieuw dossier</SelectItem>
                <SelectItem value="IN_PROGRESS">In behandeling</SelectItem>
                <SelectItem value="UNDER_REVIEW">In controle</SelectItem>
                <SelectItem value="COMPLETED">Operationeel afgerond</SelectItem>
                <SelectItem value="CLOSED">Gearchiveerd</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Textarea
            placeholder={t("placeholders.overrideReason")}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDossier(null);
                setOverrideType(null);
                setOverrideReason("");
              }}
            >
              Annuleren
            </Button>
            <Button onClick={confirmOverride}>
              Bevestigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
