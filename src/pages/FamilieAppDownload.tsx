import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, ExternalLink } from "lucide-react";
import { FaGooglePlay } from "react-icons/fa";
import logoJanazApp from "@/assets/logo-janazapp.png";
import { useTranslation } from "react-i18next";

export default function FamilieAppDownload() {
  const { t } = useTranslation();
  const appStoreUrl = "https://apps.apple.com/app/janazapp";
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.janazapp";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoJanazApp} 
              alt="JanazApp" 
              className="h-24 w-auto"
            />
          </div>
          <CardTitle className="text-3xl font-bold">
            {t("familyApp.welcome")}
          </CardTitle>
          <CardDescription className="text-lg">
            {t("familyApp.subtitle")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-6 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <Smartphone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">{t("familyApp.downloadTitle")}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("familyApp.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Button
              size="lg"
              className="h-auto py-4 px-6 flex flex-col items-center gap-2"
              onClick={() => window.open(appStoreUrl, '_blank')}
            >
              <Apple className="h-8 w-8" />
              <div className="text-left">
                <div className="text-xs opacity-90">{t("familyApp.downloadOn")}</div>
                <div className="font-semibold">{t("familyApp.appStore")}</div>
              </div>
            </Button>

            <Button
              size="lg"
              className="h-auto py-4 px-6 flex flex-col items-center gap-2"
              onClick={() => window.open(playStoreUrl, '_blank')}
            >
              <FaGooglePlay className="h-7 w-7" />
              <div className="text-left">
                <div className="text-xs opacity-90">{t("familyApp.downloadVia")}</div>
                <div className="font-semibold">{t("familyApp.googlePlay")}</div>
              </div>
            </Button>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h3 className="font-semibold text-sm">{t("familyApp.needHelp")}</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('/privacy', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("settings.privacyPolicy")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('https://help.janazapp.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("familyApp.helpCenter")}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>
              {t("familyApp.professionalNote")}
              <br />
              <a href="/auth" className="text-primary hover:underline">
                {t("familyApp.loginHere")}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
