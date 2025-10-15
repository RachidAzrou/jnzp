import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Ban, RotateCcw, AlertCircle } from 'lucide-react';
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

interface Organization {
  id: string;
  name: string;
  type: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  is_active: boolean;
  verified_at?: string;
  deactivated_at?: string;
  deactivation_reason?: string;
  verification_notes?: string;
}

interface OrganizationVerificationCardProps {
  organization: Organization;
  onUpdate: () => void;
}

export const OrganizationVerificationCard = ({
  organization,
  onUpdate,
}: OrganizationVerificationCardProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_organization' as any, {
        p_org_id: organization.id,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: t('organizationVerification.successVerified'),
          description: t('organizationVerification.successVerifiedDesc'),
        });
        setNotes('');
        onUpdate();
      } else {
        throw new Error(result?.error || t('organizationVerification.errorVerifyDesc'));
      }
    } catch (error: any) {
      console.error('Error verifying organization:', error);
      toast({
        title: t('organizationVerification.errorVerify'),
        description: error.message || t('organizationVerification.errorVerifyDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivationReason.trim()) {
      toast({
        title: 'Reden vereist',
        description: 'Voer een reden in voor deactivatie',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('deactivate_organization' as any, {
        p_org_id: organization.id,
        p_reason: deactivationReason,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: 'Organisatie gedeactiveerd',
          description: 'De organisatie is succesvol gedeactiveerd',
        });
        setDeactivationReason('');
        onUpdate();
      } else {
        throw new Error(result?.error || 'Deactivatie mislukt');
      }
    } catch (error: any) {
      console.error('Error deactivating organization:', error);
      toast({
        title: 'Fout',
        description: error.message || 'Kon organisatie niet deactiveren',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reactivate_organization' as any, {
        p_org_id: organization.id,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: 'Organisatie geactiveerd',
          description: 'De organisatie is succesvol geactiveerd',
        });
        setNotes('');
        onUpdate();
      } else {
        throw new Error(result?.error || 'Activatie mislukt');
      }
    } catch (error: any) {
      console.error('Error reactivating organization:', error);
      toast({
        title: 'Fout',
        description: error.message || 'Kon organisatie niet activeren',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!organization.is_active) {
      return <Badge variant="destructive">Gedeactiveerd</Badge>;
    }
    
    switch (organization.verification_status) {
      case 'VERIFIED':
        return <Badge className="bg-green-600">Geverifieerd</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Afgewezen</Badge>;
      case 'PENDING':
      default:
        return <Badge variant="secondary">In afwachting</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{organization.name}</CardTitle>
            <CardDescription className="mt-1">
              Type: {organization.type}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {organization.verification_notes && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Verificatie notities:</p>
            <p className="text-sm text-muted-foreground">
              {organization.verification_notes}
            </p>
          </div>
        )}

        {organization.deactivation_reason && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium mb-1 text-destructive">
              Reden voor deactivatie:
            </p>
            <p className="text-sm text-muted-foreground">
              {organization.deactivation_reason}
            </p>
          </div>
        )}

        {organization.verification_status === 'PENDING' && organization.is_active && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="notes">Verificatie notities (optioneel)</Label>
              <Textarea
                id="notes"
                placeholder={t("placeholders.verificationNotes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={loading}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Organisatie Verifiëren
            </Button>
          </div>
        )}

        {organization.is_active && organization.verification_status === 'VERIFIED' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={loading}>
                <Ban className="h-4 w-4 mr-2" />
                Organisatie Deactiveren
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Organisatie deactiveren</AlertDialogTitle>
                <AlertDialogDescription>
                  Deze actie deactiveert de organisatie. Alle gebruikers van deze
                  organisatie verliezen toegang tot het systeem.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor="deactivation-reason">
                  Reden voor deactivatie <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="deactivation-reason"
                  placeholder={t("placeholders.rejectionReason2")}
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  rows={3}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeactivate}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Deactiveren
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {!organization.is_active && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reactivation-notes">
                Activatie notities (optioneel)
              </Label>
              <Textarea
                id="reactivation-notes"
                placeholder={t("placeholders.reactivationNotes")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleReactivate}
              disabled={loading}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Organisatie Heractiveren
            </Button>
          </div>
        )}

        {organization.verified_at && (
          <p className="text-xs text-muted-foreground">
            Geverifieerd op:{' '}
            {new Date(organization.verified_at).toLocaleString('nl-NL')}
          </p>
        )}

        {organization.deactivated_at && (
          <p className="text-xs text-destructive">
            Gedeactiveerd op:{' '}
            {new Date(organization.deactivated_at).toLocaleString('nl-NL')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
