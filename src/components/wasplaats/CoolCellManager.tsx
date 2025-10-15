import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CoolCell {
  id: string;
  label: string;
  status: 'FREE' | 'RESERVED' | 'OCCUPIED' | 'OUT_OF_SERVICE';
  out_of_service_note: string | null;
  facility_org_id: string;
  created_at: string;
  updated_at: string;
}

export function CoolCellManager({ facilityOrgId }: { facilityOrgId: string }) {
  const [cells, setCells] = useState<CoolCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<CoolCell | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchCells();

    // Realtime subscriptions
    const channel = supabase
      .channel('cool-cells-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cool_cells',
          filter: `facility_org_id=eq.${facilityOrgId}`
        },
        () => {
          fetchCells();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityOrgId]);

  const fetchCells = async () => {
    try {
      const { data, error } = await supabase
        .from('cool_cells' as any)
        .select('*')
        .eq('facility_org_id', facilityOrgId)
        .order('label');

      if (error) throw error;
      setCells((data as any) || []);
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: t("wasplaats.errorLoadCells"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCell = async (formData: {
    label: string;
    status: string;
    out_of_service_note?: string;
  }) => {
    try {
      if (editingCell) {
        // Update
        const { error } = await supabase
          .from('cool_cells' as any)
          .update({
            label: formData.label,
            status: formData.status,
            out_of_service_note: formData.status === 'OUT_OF_SERVICE' ? formData.out_of_service_note : null
          })
          .eq('id', editingCell.id);

        if (error) throw error;

        toast({
          title: t("wasplaats.cellUpdated"),
          description: t("wasplaats.cellUpdatedDesc", { label: formData.label })
        });
      } else {
        // Create
        const { error } = await supabase
          .from('cool_cells' as any)
          .insert({
            facility_org_id: facilityOrgId,
            label: formData.label,
            status: formData.status,
            out_of_service_note: formData.status === 'OUT_OF_SERVICE' ? formData.out_of_service_note : null
          });

        if (error) throw error;

        toast({
          title: t("wasplaats.cellAdded"),
          description: t("wasplaats.cellAddedDesc", { label: formData.label })
        });
      }

      setIsDialogOpen(false);
      setEditingCell(null);
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteCell = async (cellId: string) => {
    if (!confirm(t("wasplaats.deleteCoolCell"))) return;

    try {
      const { error } = await supabase
        .from('cool_cells' as any)
        .delete()
        .eq('id', cellId);

      if (error) throw error;

      toast({
        title: t("wasplaats.cellDeleted"),
        description: t("wasplaats.cellDeletedDesc")
      });
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FREE':
        return 'default';
      case 'RESERVED':
        return 'secondary';
      case 'OCCUPIED':
        return 'outline';
      case 'OUT_OF_SERVICE':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      FREE: 'wasplaats.statusFree',
      RESERVED: 'wasplaats.statusReserved',
      OCCUPIED: 'wasplaats.statusOccupied',
      OUT_OF_SERVICE: 'wasplaats.statusOutOfService'
    };
    return t(statusMap[status] || status);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("wasplaats.coolCells")}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCell(null)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("wasplaats.addCoolCell")}
            </Button>
          </DialogTrigger>
          <CoolCellDialog
            cell={editingCell}
            onSave={handleSaveCell}
            onClose={() => {
              setIsDialogOpen(false);
              setEditingCell(null);
            }}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cells.map((cell) => (
          <Card key={cell.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{cell.label}</CardTitle>
                <Badge variant={getStatusColor(cell.status)}>
                  {getStatusLabel(cell.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {cell.status === 'OUT_OF_SERVICE' && cell.out_of_service_note && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <p className="text-sm">{cell.out_of_service_note}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCell(cell);
                    setIsDialogOpen(true);
                  }}
                  className="flex-1"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t("wasplaats.edit")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCell(cell.id)}
                >
                  {t("wasplaats.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cells.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{t("wasplaats.noCellsConfigured")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CoolCellDialog({
  cell,
  onSave,
  onClose
}: {
  cell: CoolCell | null;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<{
    label: string;
    status: 'FREE' | 'RESERVED' | 'OCCUPIED' | 'OUT_OF_SERVICE';
    out_of_service_note: string;
  }>({
    label: cell?.label || '',
    status: (cell?.status as any) || 'FREE',
    out_of_service_note: cell?.out_of_service_note || ''
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {cell ? t("wasplaats.editCoolCell") : t("wasplaats.addCoolCell")}
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("wasplaats.label")}</Label>
          <Input
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder={t("wasplaats.labelPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("tasks.status")}</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">{t("wasplaats.statusFree")}</SelectItem>
              <SelectItem value="RESERVED">{t("wasplaats.statusReserved")}</SelectItem>
              <SelectItem value="OCCUPIED">{t("wasplaats.statusOccupied")}</SelectItem>
              <SelectItem value="OUT_OF_SERVICE">{t("wasplaats.statusOutOfService")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.status === 'OUT_OF_SERVICE' && (
          <div className="space-y-2">
            <Label>{t("wasplaats.outOfServiceReason")}</Label>
            <Textarea
              value={formData.out_of_service_note}
              onChange={(e) => setFormData({ ...formData, out_of_service_note: e.target.value })}
              placeholder={t("wasplaats.outOfServicePlaceholder")}
              rows={3}
            />
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t("wasplaats.cancel")}
        </Button>
        <Button onClick={() => onSave(formData)} disabled={!formData.label}>
          {t("wasplaats.save")}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
