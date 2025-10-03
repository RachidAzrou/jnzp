import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Trash2, FileText, AlertCircle } from 'lucide-react';
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
        title: 'Fout',
        description: 'Kon GDPR verzoeken niet laden',
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
          title: 'Verzoek ingediend',
          description: result.message,
        });
        fetchRequests();
      } else {
        throw new Error(result?.error || 'Verzoek mislukt');
      }
    } catch (error: any) {
      console.error('Error requesting data export:', error);
      toast({
        title: 'Fout',
        description: error.message || 'Kon data export niet aanvragen',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!deletionReason.trim()) {
      toast({
        title: 'Reden vereist',
        description: 'Geef een reden voor het verwijderen van uw gegevens',
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
          title: 'Verzoek ingediend',
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
        title: 'Fout',
        description: error.message || 'Kon data verwijdering niet aanvragen',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600">Voltooid</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary">In behandeling</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Afgewezen</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="outline">In afwachting</Badge>;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'DATA_EXPORT':
        return 'Data Export';
      case 'DATA_DELETION':
        return 'Data Verwijdering';
      case 'DATA_ACCESS':
        return 'Data Inzage';
      case 'DATA_PORTABILITY':
        return 'Data Overdraagbaarheid';
      default:
        return type;
    }
  };

  if (loading) {
    return <div>Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Gegevens</CardTitle>
          <CardDescription>
            Beheer uw persoonlijke gegevens en privacy instellingen conform de AVG/GDPR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Data Export</CardTitle>
                <CardDescription>
                  Download al uw gegevens in een gestructureerd formaat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleDataExport}
                  disabled={requesting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Verzoek Data Export
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Uw gegevens worden binnen 30 dagen verwerkt
                </p>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  Data Verwijdering
                </CardTitle>
                <CardDescription>
                  Verzoek om al uw gegevens te laten verwijderen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={requesting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verzoek Data Verwijdering
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Data verwijdering aanvragen</AlertDialogTitle>
                      <AlertDialogDescription>
                        Deze actie kan niet ongedaan worden gemaakt. Al uw gegevens worden permanent
                        verwijderd na goedkeuring van dit verzoek.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                      <Label htmlFor="deletion-reason">
                        Reden voor verwijdering <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="deletion-reason"
                        placeholder="Waarom wilt u uw gegevens laten verwijderen?"
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDataDeletion}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Verzoek Indienen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  Let op: Dit verwijdert al uw gegevens permanent
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mijn Verzoeken</CardTitle>
            <CardDescription>Overzicht van uw GDPR verzoeken</CardDescription>
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
                      Aangevraagd op:{' '}
                      {new Date(request.requested_at).toLocaleDateString('nl-NL')}
                    </p>
                    {request.processed_at && (
                      <p className="text-sm text-muted-foreground">
                        Verwerkt op:{' '}
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
                        Download
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
