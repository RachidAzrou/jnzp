import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CheckEmail() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Mail className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Bevestig je e-mailadres
          </h1>
        </div>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            We hebben je een verificatielink gestuurd. Klik daarop om je account te activeren.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Check ook je spam/ongewenste e-mail map als je de mail niet kunt vinden.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate("/auth")}
          variant="outline"
          className="w-full"
        >
          Terug naar inloggen
        </Button>
      </Card>
    </div>
  );
}
