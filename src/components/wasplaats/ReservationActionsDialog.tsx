import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, UserCheck, UserX } from "lucide-react";

interface ReservationActionsDialogProps {
  reservationId: string;
  status: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReservationActionsDialog({
  reservationId,
  status,
  onClose,
  onSuccess
}: ReservationActionsDialogProps) {
  const [action, setAction] = useState<'confirm' | 'reject' | 'arrive' | 'depart' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cool_cell_reservations')
        .update({ status: 'CONFIRMED' })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: t("wasplaats.reservationConfirmed"),
        description: t("wasplaats.reservationConfirmedDesc")
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: t("tasks.error"),
        description: t("wasplaats.rejectionReasonRequired"),
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cool_cell_reservations')
        .update({ 
          status: 'REJECTED',
          rejection_reason: rejectionReason
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: t("wasplaats.reservationRejected"),
        description: t("wasplaats.reservationRejectedDesc")
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkArrival = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("common.notAuthenticated"));

      const { error } = await supabase.rpc('mark_cool_cell_arrival', {
        p_reservation_id: reservationId,
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: t("wasplaats.arrivalMarked"),
        description: t("wasplaats.arrivalMarkedDesc")
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDeparture = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("common.notAuthenticated"));

      const { error } = await supabase.rpc('mark_cool_cell_departure', {
        p_reservation_id: reservationId,
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: t("wasplaats.departureMarked"),
        description: t("wasplaats.departureMarkedDesc")
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: t("tasks.error"),
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!action) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasplaats.reservationActions")}</DialogTitle>
            <DialogDescription>
              {t("wasplaats.selectAction")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {status === 'PENDING' && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAction('confirm')}
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  {t("wasplaats.confirmReservation")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAction('reject')}
                >
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  {t("wasplaats.rejectReservation")}
                </Button>
              </>
            )}

            {status === 'CONFIRMED' && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAction('arrive')}
              >
                <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                {t("wasplaats.markArrival")}
              </Button>
            )}

            {status === 'OCCUPIED' && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setAction('depart')}
              >
                <UserX className="h-4 w-4 mr-2 text-orange-600" />
                {t("wasplaats.markDeparture")}
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === 'confirm') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasplaats.confirmReservation")}</DialogTitle>
            <DialogDescription>
              {t("wasplaats.confirmReservationDesc")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              {t("common.back")}
            </Button>
            <Button onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === 'reject') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasplaats.rejectReservation")}</DialogTitle>
            <DialogDescription>
              {t("wasplaats.rejectReservationDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("wasplaats.rejectionReason")}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("wasplaats.rejectionReasonPlaceholder")}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              {t("common.back")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isSubmitting || !rejectionReason.trim()}
            >
              {isSubmitting ? t("common.saving") : t("wasplaats.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === 'arrive') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasplaats.markArrival")}</DialogTitle>
            <DialogDescription>
              {t("wasplaats.markArrivalDesc")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              {t("common.back")}
            </Button>
            <Button onClick={handleMarkArrival} disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("wasplaats.markArrived")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (action === 'depart') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wasplaats.markDeparture")}</DialogTitle>
            <DialogDescription>
              {t("wasplaats.markDepartureDesc")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              {t("common.back")}
            </Button>
            <Button onClick={handleMarkDeparture} disabled={isSubmitting}>
              {isSubmitting ? t("common.saving") : t("wasplaats.markDeparted")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}