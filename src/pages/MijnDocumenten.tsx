import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";

export default function MijnDocumenten() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['my-documents', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          dossiers (
            ref_number,
            deceased_name
          )
        `)
        .eq('uploaded_by', session!.user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Goedgekeurd</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Afgekeurd</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">In behandeling</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mijn Documenten</h1>
          <p className="text-muted-foreground mt-1">
            Upload en beheer uw documenten
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Document Uploaden
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : !documents || documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nog geen documenten"
          description="U heeft nog geen documenten geüpload. Upload uw eerste document om te beginnen."
          action={{
            label: "Document Uploaden",
            onClick: () => setUploadDialogOpen(true)
          }}
        />
      ) : (
        <div className="grid gap-4">
          {documents.map((doc: any) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <CardTitle className="text-lg">{doc.file_name}</CardTitle>
                      <CardDescription>
                        Dossier: {doc.dossiers?.ref_number} - {doc.dossiers?.deceased_name}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Document Type</p>
                    <p className="font-medium">{doc.doc_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Upload Datum</p>
                    <p className="font-medium">
                      {new Date(doc.uploaded_at).toLocaleDateString('nl-NL')}
                    </p>
                  </div>
                  {doc.status === 'REJECTED' && doc.rejection_reason && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Reden afkeuring</p>
                      <p className="font-medium text-red-600">{doc.rejection_reason}</p>
                    </div>
                  )}
                  {doc.status === 'APPROVED' && doc.reviewed_at && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Goedgekeurd op</p>
                      <p className="font-medium text-green-600">
                        {new Date(doc.reviewed_at).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={() => {
          refetch();
          setUploadDialogOpen(false);
        }}
      />
    </div>
  );
}