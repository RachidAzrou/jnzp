import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { nl, arSA } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Announcement = {
  id: string;
  title_nl: string;
  title_ar: string;
  body_nl: string;
  body_ar: string;
  visible_until: string | null;
  created_at: string;
};

type FeedData = {
  mosque: {
    name: string;
    address: string;
    contact: string;
  };
  announcements: Announcement[];
  theme: Record<string, any>;
};

export default function PublicMosqueFeed() {
  const { token } = useParams<{ token: string }>();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'nl' | 'ar'>('nl');

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-mosque-feed?token=${token}`
        );
        
        if (!response.ok) {
          throw new Error("Ongeldige of verlopen link");
        }

        const data = await response.json();
        setFeedData(data);
      } catch (err) {
        setError(String(err));
      }
    };

    if (token) {
      fetchFeed();
      // Refresh every 30 seconds
      const interval = setInterval(fetchFeed, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Niet gevonden</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!feedData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  const visibleAnnouncements = feedData.announcements.filter(
    (a) => !a.visible_until || new Date(a.visible_until) > new Date()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold">{feedData.mosque.name}</h1>
          <p className="text-muted-foreground">{feedData.mosque.address}</p>
          {feedData.mosque.contact && (
            <p className="text-sm text-muted-foreground">{feedData.mosque.contact}</p>
          )}
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center">
          <Tabs value={language} onValueChange={(v) => setLanguage(v as 'nl' | 'ar')}>
            <TabsList>
              <TabsTrigger value="nl">Nederlands</TabsTrigger>
              <TabsTrigger value="ar">العربية</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Announcements */}
        <div className="space-y-6">
          {visibleAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  {language === 'nl' 
                    ? 'Geen mededelingen op dit moment' 
                    : 'لا توجد إعلانات في الوقت الحالي'}
                </p>
              </CardContent>
            </Card>
          ) : (
            visibleAnnouncements.map((announcement, index) => (
              <Card
                key={announcement.id}
                className="bg-card/80 backdrop-blur-sm border-2 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold">
                      {language === 'nl' ? announcement.title_nl : announcement.title_ar}
                    </h2>
                    <div className="text-lg leading-relaxed whitespace-pre-line">
                      {language === 'nl' ? announcement.body_nl : announcement.body_ar}
                    </div>
                    <div className="text-sm text-muted-foreground pt-4 border-t">
                      {language === 'nl' 
                        ? `Gepubliceerd: ${format(new Date(announcement.created_at), "PPP 'om' p", { locale: nl })}`
                        : `تاريخ النشر: ${format(new Date(announcement.created_at), "PPP 'الساعة' p", { locale: arSA })}`
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>JanazApp • Centraal platform voor uitvaartzorg</p>
        </div>
      </div>
    </div>
  );
}
