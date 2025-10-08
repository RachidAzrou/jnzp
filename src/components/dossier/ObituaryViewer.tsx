import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

interface ObituaryViewerProps {
  dossierId: string;
}

interface ObituaryDocument {
  id: string;
  file_url: string;
  file_name: string;
  language: string;
  version: number;
  uploaded_at: string;
}

export function ObituaryViewer({ dossierId }: ObituaryViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<ObituaryDocument | null>(null);

  const { data: obituaries, isLoading } = useQuery({
    queryKey: ['obituaries', dossierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId)
        .eq('doc_type', 'OBITUARY_JANAZAH' as any) // Cast needed until types regenerate
        .order('version', { ascending: false })
        .order('language', { ascending: true });

      if (error) throw error;
      
      // Filter and type the results
      return (data || [])
        .filter(d => d.language && d.version)
        .map(d => ({
          id: d.id,
          file_url: d.file_url,
          file_name: d.file_name,
          language: d.language!,
          version: d.version!,
          uploaded_at: d.uploaded_at
        })) as ObituaryDocument[];
    }
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  if (!obituaries || obituaries.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          Het overlijdensbericht wordt automatisch gegenereerd zodra het janazagebed is gepland.
        </p>
      </div>
    );
  }

  // Group by version
  const latestVersion = obituaries[0].version;
  const latestObituaries = obituaries.filter(o => o.version === latestVersion);
  const hasOlderVersions = obituaries.some(o => o.version < latestVersion);

  return (
    <div className="space-y-4">
      {hasOlderVersions && (
        <div className="flex justify-end">
          <Badge variant="outline">Versie {latestVersion}</Badge>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestObituaries.map((doc) => (
            <div 
              key={doc.id}
              className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    {doc.language === 'NL' ? '🇳🇱 Nederlands' : '🇸🇦 العربية'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(doc.uploaded_at), 'dd-MM-yyyy HH:mm')}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  v{doc.version}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDoc(doc)}
                      className="flex-1"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>
                        Overlijdensbericht - {doc.language === 'NL' ? 'Nederlands' : 'العربية'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-auto max-h-[70vh]">
                      <iframe
                        src={doc.file_url}
                        className="w-full h-[600px] border rounded"
                        title={`Obituary ${doc.language}`}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open(doc.file_url, '_blank')}
                  className="flex-1"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
        ))}
      </div>

      {hasOlderVersions && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Eerdere versies ({obituaries.length - latestObituaries.length})
          </summary>
          <div className="mt-3 space-y-2 pl-4 border-l-2">
            {obituaries
              .filter(o => o.version < latestVersion)
              .map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-xs">
                  <span>
                    {doc.language === 'NL' ? '🇳🇱' : '🇸🇦'} Versie {doc.version} • {format(new Date(doc.uploaded_at), 'dd-MM-yyyy HH:mm')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}