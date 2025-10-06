import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface InviteInfo {
  organization_name: string;
  role_label: string;
  status: string;
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Ongeldige uitnodiging.");
      setLoading(false);
      return;
    }

    fetchInviteInfo();
  }, [token]);

  const fetchInviteInfo = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("invite-info", {
        body: { token },
      });

      if (error) throw error;
      setInvite(data);
    } catch (e: any) {
      setError(e.message ?? "Kon uitnodiging niet laden.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setSubmitting(true);

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to login with return URL
        toast({
          title: "Inloggen vereist",
          description: "Je moet eerst inloggen om de uitnodiging te accepteren",
        });
        navigate(`/auth?redirect=/invite/accept?token=${token}`);
        return;
      }

      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Uitnodiging geaccepteerd",
        description: "Je bent nu lid van de organisatie",
      });

      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Accepteren mislukt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Fout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{error}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Terug naar login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Uitnodiging niet gevonden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Deze uitnodiging bestaat niet of is niet meer geldig.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status !== "PENDING") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Uitnodiging niet geldig</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {invite.status === "ACCEPTED" && "Deze uitnodiging is al geaccepteerd."}
              {invite.status === "EXPIRED" && "Deze uitnodiging is verlopen. Vraag een nieuwe aan bij je organisatiebeheerder."}
              {invite.status === "CANCELLED" && "Deze uitnodiging is geannuleerd."}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate("/auth")}
            >
              Terug naar login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Uitnodiging accepteren</CardTitle>
          <CardDescription>
            Je bent uitgenodigd door <strong>{invite.organization_name}</strong> als{" "}
            <strong>{invite.role_label}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Klik op "Accepteren" om lid te worden van deze organisatie.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleAccept} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accepteren
              </Button>
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Annuleren
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Als je nog geen account hebt, maak dan eerst een account aan. Daarna kun je de
              link opnieuw openen.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
