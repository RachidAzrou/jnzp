import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Trash2, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GDPRRequest {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  processed_at?: string;
  export_url?: string;
  rejection_reason?: string;
}

export const GDPRRequestPanel = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<GDPRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletionReason, setDeletionReason] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching GDPR requests:', error);
      toast({
        title: t("common.error"),
        description: t("gdpr.errorLoadingRequests"),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    setRequesting(true);
    try {
      const { data, error } = await supabase.rpc('request_data_export' as any);

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: t("gdpr.requestSubmitted"),
          description: result.message,
        });
        fetchRequests();
      } else {
        throw new Error(result?.error || 'Verzoek mislukt');
      }
    } catch (error: any) {
      console.error('Error requesting data export:', error);
      toast({
        title: t("common.error"),
        description: error.message || t("gdpr.errorRequestingExport"),
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!deletionReason.trim()) {
      toast({
        title: t("gdpr.deletionReasonRequired"),
        description: t("gdpr.deletionReasonRequiredDesc"),
        variant: 'destructive',
      });
      return;
    }

    setRequesting(true);
    try {
      const { data, error } = await supabase.rpc('request_data_deletion' as any, {
        p_reason: deletionReason,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: t("gdpr.requestSubmitted"),
          description: result.message,
        });
        setDeletionReason('');
        fetchRequests();
      } else {
        throw new Error(result?.error || 'Verzoek mislukt');
      }
    } catch (error: any) {
      console.error('Error requesting data deletion:', error);
      toast({
        title: t("common.error"),
        description: error.message || t("gdpr.errorRequestingDeletion"),
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">{t("gdpr.statusCompleted")}</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">{t("gdpr.statusProcessing")}</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">{t("gdpr.statusRejected")}</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="outline">{t("gdpr.statusPending")}</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'DATA_EXPORT':
        return t("gdpr.requestTypeExport");
      case 'DATA_DELETION':
        return t("gdpr.requestTypeDeletion");
      case 'DATA_ACCESS':
        return t("gdpr.requestTypeAccess");
      case 'DATA_PORTABILITY':
        return t("gdpr.requestTypePortability");
      default:
        return type;
    }
  };

  if (loading) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("gdpr.title")}</CardTitle>
          <CardDescription>
            {t("gdpr.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("gdpr.dataExport")}</CardTitle>
                <CardDescription>
                  {t("gdpr.dataExportDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleDataExport}
                  disabled={requesting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("gdpr.requestDataExport")}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("gdpr.processingTime")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  {t("gdpr.dataDeletion")}
                </CardTitle>
                <CardDescription>
                  {t("gdpr.dataDeletionDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={requesting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("gdpr.requestDataDeletion")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("gdpr.deletionDialogTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("gdpr.deletionDialogDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                      <Label htmlFor="deletion-reason">
                        {t("gdpr.deletionReasonLabel")} <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="deletion-reason"
                        placeholder={t("placeholders.gdprDeletionReason")}
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDataDeletion}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {t("gdpr.submitRequest")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("gdpr.deletionWarning")}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("gdpr.myRequests")}</CardTitle>
            <CardDescription>{t("gdpr.myRequestsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getRequestTypeLabel(request.request_type)}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("gdpr.requestedOn")}{' '}
                      {new Date(request.requested_at).toLocaleDateString('nl-NL')}
                    </p>
                    {request.processed_at && (
                      <p className="text-sm text-muted-foreground">
                        {t("gdpr.processedOn")}{' '}
                        {new Date(request.processed_at).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                    {request.rejection_reason && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {request.rejection_reason}
                      </p>
                    )}
                  </div>
                  {request.export_url && (
                    <Button variant="outline" asChild>
                      <a href={request.export_url} download>
                        <Download className="h-4 w-4 mr-2" />
                        {t("common.download")}
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
