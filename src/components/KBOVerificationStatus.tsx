import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KBOVerificationStatusProps {
  decision: 'pass' | 'warn' | 'block';
  comparison?: {
    name: 'match' | 'minor' | 'mismatch';
    street: 'match' | 'minor' | 'mismatch';
    number: 'match' | 'minor' | 'mismatch';
    postcode: 'match' | 'mismatch';
    city: 'match' | 'minor' | 'mismatch';
  };
  kboData?: {
    name: string;
    address: {
      street: string;
      houseNumber: string;
      postcode: string;
      city: string;
    };
  };
  onContinue?: () => void;
  onCorrect?: () => void;
}

export function KBOVerificationStatus({ 
  decision, 
  comparison, 
  kboData,
  onContinue,
  onCorrect 
}: KBOVerificationStatusProps) {
  if (decision === 'pass') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Ondernemingsnummer bevestigd</AlertTitle>
        <AlertDescription className="text-green-800">
          De ingevoerde gegevens komen overeen met de KBO-gegevens.
        </AlertDescription>
      </Alert>
    );
  }

  if (decision === 'warn') {
    return (
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">Kleine verschillen gedetecteerd</AlertTitle>
          <AlertDescription className="text-yellow-800">
            Het ondernemingsnummer is geldig, maar er zijn enkele kleine verschillen tussen uw invoer en de KBO-gegevens.
          </AlertDescription>
        </Alert>

        {comparison && kboData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vergelijking met KBO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {comparison.name !== 'match' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bedrijfsnaam:</span>
                  <span className={comparison.name === 'minor' ? 'text-yellow-600' : 'text-red-600'}>
                    {comparison.name === 'minor' ? 'Klein verschil' : 'Verschilt'}
                  </span>
                </div>
              )}
              {comparison.street !== 'match' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Straat:</span>
                  <span className={comparison.street === 'minor' ? 'text-yellow-600' : 'text-red-600'}>
                    {comparison.street === 'minor' ? 'Klein verschil' : 'Verschilt'}
                  </span>
                </div>
              )}
              {comparison.city !== 'match' && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stad:</span>
                  <span className={comparison.city === 'minor' ? 'text-yellow-600' : 'text-red-600'}>
                    {comparison.city === 'minor' ? 'Klein verschil' : 'Verschilt'}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  KBO-gegevens: {kboData.name}, {kboData.address.street} {kboData.address.houseNumber}, {kboData.address.postcode} {kboData.address.city}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          {onCorrect && (
            <Button onClick={onCorrect} variant="outline">
              Terug naar formulier
            </Button>
          )}
          {onContinue && (
            <Button onClick={onContinue}>
              Toch doorgaan
            </Button>
          )}
        </div>
      </div>
    );
  }

  // decision === 'block'
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Gegevens komen niet overeen</AlertTitle>
        <AlertDescription>
          De ingevoerde gegevens komen niet overeen met de KBO-gegevens voor dit ondernemingsnummer. Controleer uw gegevens en probeer opnieuw.
        </AlertDescription>
      </Alert>

      {comparison && kboData && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm text-red-900">KBO-gegevens voor dit nummer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><strong>Naam:</strong> {kboData.name}</p>
            <p><strong>Adres:</strong> {kboData.address.street} {kboData.address.houseNumber}</p>
            <p><strong>Postcode:</strong> {kboData.address.postcode}</p>
            <p><strong>Stad:</strong> {kboData.address.city}</p>
          </CardContent>
        </Card>
      )}

      {onCorrect && (
        <Button onClick={onCorrect} variant="outline" className="w-full">
          Terug naar formulier
        </Button>
      )}
    </div>
  );
}
