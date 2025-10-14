import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function CheckEmail() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Mail className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("checkEmail.title")}
          </h1>
        </div>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {t("checkEmail.description")}
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t("checkEmail.spamNotice")}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => navigate("/auth")}
          variant="outline"
          className="w-full"
        >
          {t("checkEmail.backToLogin")}
        </Button>
      </Card>
    </div>
  );
}
