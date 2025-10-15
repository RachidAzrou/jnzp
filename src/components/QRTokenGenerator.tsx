import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { createQRToken, generateQRCodeURL, QRTokenData } from '@/utils/qrToken';
import { Download, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QRTokenGeneratorProps {
  dossierId: string;
  dossierDisplayId: string;
}

export const QRTokenGenerator = ({ dossierId, dossierDisplayId }: QRTokenGeneratorProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<QRTokenData | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [maxScans, setMaxScans] = useState<number | undefined>(undefined);
  const [scopes, setScopes] = useState({
    basic_info: true,
    documents: false,
    status: true,
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = await createQRToken({
        dossierId,
        expiresInHours,
        scopes,
        maxScans,
      });

      if (token) {
        setGeneratedToken(token);
        toast({
          title: 'QR Code gegenereerd',
          description: 'QR code is succesvol aangemaakt',
        });
      } else {
        toast({
          title: 'Fout',
          description: 'QR code kon niet worden aangemaakt',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating QR token:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedToken) return;

    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${dossierDisplayId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleCopyUrl = async () => {
    if (!generatedToken) return;

    const url = generateQRCodeURL(generatedToken.token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: t("qrToken.copied"),
      description: t("qrToken.copiedDesc"),
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("qrToken.title")}</CardTitle>
          <CardDescription>
            {t("qrToken.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expires">{t("qrToken.validFor")}</Label>
            <Input
              id="expires"
              type="number"
              min="1"
              max="168"
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-scans">{t("qrToken.maxScans")}</Label>
            <Input
              id="max-scans"
              type="number"
              min="1"
              placeholder={t("qrToken.unlimited")}
              value={maxScans || ''}
              onChange={(e) => setMaxScans(e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>

          <div className="space-y-3">
            <Label>{t("qrToken.accessInfo")}</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="basic-info" className="font-normal">
                  {t("qrToken.basicInfo")}
                </Label>
                <Switch
                  id="basic-info"
                  checked={scopes.basic_info}
                  onCheckedChange={(checked) =>
                    setScopes({ ...scopes, basic_info: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="status" className="font-normal">
                  {t("qrToken.statusInfo")}
                </Label>
                <Switch
                  id="status"
                  checked={scopes.status}
                  onCheckedChange={(checked) =>
                    setScopes({ ...scopes, status: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="documents" className="font-normal">
                  {t("qrToken.documents")}
                </Label>
                <Switch
                  id="documents"
                  checked={scopes.documents}
                  onCheckedChange={(checked) =>
                    setScopes({ ...scopes, documents: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? t("qrToken.generating") : t("qrToken.generate")}
          </Button>
        </CardContent>
      </Card>

      {generatedToken && (
        <Card>
          <CardHeader>
            <CardTitle>{t("qrToken.generatedTitle")}</CardTitle>
            <CardDescription>
              {t("qrToken.generatedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <QRCodeSVG
                id="qr-code-svg"
                value={generateQRCodeURL(generatedToken.token)}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {t("qrToken.expiresOn")}:{' '}
                <span className="font-medium text-foreground">
                  {new Date(generatedToken.expires_at).toLocaleString('nl-NL')}
                </span>
              </p>
              {generatedToken.max_scans && (
                <p className="text-muted-foreground">
                  {t("qrToken.maxScans")}:{' '}
                  <span className="font-medium text-foreground">
                    {generatedToken.max_scans}
                  </span>
                </p>
              )}
              <p className="text-muted-foreground">
                {t("qrToken.scans")}: <span className="font-medium text-foreground">{generatedToken.scan_count}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                {t("qrToken.download")}
              </Button>
              <Button onClick={handleCopyUrl} variant="outline" className="flex-1">
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? t("qrToken.copied") : t("qrToken.copyUrl")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
