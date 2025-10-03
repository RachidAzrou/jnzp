import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { verifyQRToken, VerifyQRTokenResult } from '@/utils/qrToken';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function QRScan() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyQRTokenResult | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const verificationResult = await verifyQRToken(token);
        setResult(verificationResult);
      } catch (error) {
        console.error('Error verifying token:', error);
        setResult({ success: false, error: 'Er is een fout opgetreden' });
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">QR code verifiëren...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Ongeldige QR Code</CardTitle>
            <CardDescription className="text-center">
              Deze QR code is niet geldig of ontbreekt
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Toegang Geweigerd</CardTitle>
            <CardDescription className="text-center">
              {result.error || 'Deze QR code is niet geldig'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Mogelijke redenen:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>QR code is verlopen</li>
                  <li>QR code is ingetrokken</li>
                  <li>Maximum aantal scans bereikt</li>
                  <li>Ongeldige QR code</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-center">QR Code Geverifieerd</CardTitle>
          <CardDescription className="text-center">
            Toegang verleend tot dossier informatie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">Dossier ID</span>
              <Badge variant="outline">{result.display_id}</Badge>
            </div>

            {result.dossier_info?.deceased_name && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Naam</span>
                <span className="text-sm">{result.dossier_info.deceased_name}</span>
              </div>
            )}

            {result.dossier_info?.status && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Status</span>
                <Badge>{result.dossier_info.status}</Badge>
              </div>
            )}

            {result.dossier_info?.flow && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Flow</span>
                <Badge variant="secondary">{result.dossier_info.flow}</Badge>
              </div>
            )}
          </div>

          <Alert>
            <AlertDescription>
              Deze informatie is vertrouwelijk en alleen bedoeld voor geautoriseerde personen.
              Het scannen van deze QR code is gelogd voor beveiligingsdoeleinden.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
