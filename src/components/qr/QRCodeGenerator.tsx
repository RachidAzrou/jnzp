import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download } from "lucide-react";

interface QRCodeGeneratorProps {
  dossierId: string;
  displayId: string;
}

export function QRCodeGenerator({ dossierId, displayId }: QRCodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [qrData, setQrData] = useState<{ token: string; url: string } | null>(null);
  const [maxScans, setMaxScans] = useState<number | null>(null);
  const [scopes, setScopes] = useState({
    basic_info: true,
    documents: false,
    timeline: false
  });
  const { toast } = useToast();

  const generateQRCode = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use RPC endpoint to generate QR token
      const { data, error } = await supabase.rpc('generate_qr_token_rpc', {
        p_dossier_id: dossierId,
        p_scopes: scopes,
        p_max_scans: maxScans || null,
        p_expires_hours: 168, // 7 days
      });

      if (error) throw error;
      if (!data) throw new Error('Geen QR data ontvangen');

      // Type the RPC response properly
      const result = data as { 
        success: boolean; 
        token: string; 
        token_id: string; 
        expires_at: string;
      };

      // RPC returns a single JSONB object
      const baseUrl = window.location.origin;
      const qrUrl = `${baseUrl}/qr/${result.token}`;

      setQrData({
        token: result.token,
        url: qrUrl
      });

      toast({
        title: "QR Code gegenereerd",
        description: `Verloopt op ${new Date(result.expires_at).toLocaleDateString('nl-NL')}`,
      });
    } catch (error: any) {
      console.error('QR generation error:', error);
      toast({
        title: "Fout",
        description: error.message || 'Er is een fout opgetreden bij het genereren van de QR code',
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadQRCode = () => {
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
      downloadLink.download = `qr-dossier-${displayId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <QrCode className="h-4 w-4 mr-2" />
          QR Code genereren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code voor dossier {displayId}</DialogTitle>
          <DialogDescription>
            Genereer een veilige QR code voor dit dossier met configureerbare toegangsrechten
          </DialogDescription>
        </DialogHeader>
        
        {!qrData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Maximaal aantal scans (optioneel)</Label>
              <Input
                type="number"
                placeholder="Onbeperkt"
                value={maxScans || ''}
                onChange={(e) => setMaxScans(e.target.value ? parseInt(e.target.value) : null)}
                min={1}
              />
            </div>

            <div className="space-y-3">
              <Label>Toegang tot:</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="basic_info"
                    checked={scopes.basic_info}
                    onCheckedChange={(checked) => 
                      setScopes({ ...scopes, basic_info: checked as boolean })
                    }
                  />
                  <label htmlFor="basic_info" className="text-sm">
                    Basis informatie (naam, status)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documents"
                    checked={scopes.documents}
                    onCheckedChange={(checked) => 
                      setScopes({ ...scopes, documents: checked as boolean })
                    }
                  />
                  <label htmlFor="documents" className="text-sm">
                    Documenten
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="timeline"
                    checked={scopes.timeline}
                    onCheckedChange={(checked) => 
                      setScopes({ ...scopes, timeline: checked as boolean })
                    }
                  />
                  <label htmlFor="timeline" className="text-sm">
                    Tijdlijn
                  </label>
                </div>
              </div>
            </div>

            <Button 
              onClick={generateQRCode} 
              disabled={generating}
              className="w-full"
            >
              {generating ? "Genereren..." : "QR Code genereren"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrData.url}
                size={256}
                level="H"
                includeMargin
              />
            </div>

            <div className="space-y-2">
              <Label>QR Code URL</Label>
              <Input
                value={qrData.url}
                readOnly
                onClick={(e) => e.currentTarget.select()}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadQRCode} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setQrData(null);
                  setOpen(false);
                }}
              >
                Sluiten
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
