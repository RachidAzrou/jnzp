import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicJanazaScreen() {
  const { mosqueSlug } = useParams();

  const { data: mosque } = useQuery({
    queryKey: ["public-mosque", mosqueSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("slug", mosqueSlug)
        .eq("type", "MOSQUE")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!mosqueSlug,
  });

  const { data: services, refetch } = useQuery({
    queryKey: ["public-janaza-services", mosque?.id],
    queryFn: async () => {
      if (!mosque?.id) return { upcoming: [], recent: [] };

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const { data: upcoming, error: upcomingError } = await supabase
        .from("mosque_services")
        .select(`
          *,
          dossier:dossiers(
            deceased_name,
            deceased_dob,
            deceased_gender
          )
        `)
        .eq("mosque_org_id", mosque.id)
        .eq("status", "CONFIRMED")
        .gte("confirmed_slot", now.toISOString())
        .order("confirmed_slot", { ascending: true })
        .limit(10);

      if (upcomingError) throw upcomingError;

      const { data: recent, error: recentError } = await supabase
        .from("mosque_services")
        .select(`
          *,
          dossier:dossiers(
            deceased_name,
            deceased_dob,
            deceased_gender
          )
        `)
        .eq("mosque_org_id", mosque.id)
        .eq("status", "CONFIRMED")
        .lt("confirmed_slot", now.toISOString())
        .gte("confirmed_slot", threeDaysAgo.toISOString())
        .order("confirmed_slot", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      return {
        upcoming: upcoming || [],
        recent: recent || [],
      };
    },
    enabled: !!mosque?.id,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  // Auto-refresh page every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60000);

    return () => clearInterval(interval);
  }, [refetch]);

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return new Date().getFullYear() - new Date(dob).getFullYear();
  };

  const getPronoun = (gender: string | null) => {
    if (gender === "M") return "hem";
    if (gender === "F") return "haar";
    return "hem/haar";
  };

  if (!mosque) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Moskee niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">{mosque.name}</h1>
        <div className="text-2xl text-gray-300 mb-2">
          إِنَّا لِلّهِ وَإِنَّـا إِلَيْهِ رَاجِعونَ
        </div>
        <p className="text-lg text-gray-400">
          Voorwaar, wij behoren Allah toe en tot Hem keren wij terug
        </p>
      </div>

      {/* Upcoming Janaza Prayers */}
      {services?.upcoming && services.upcoming.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-semibold mb-6 text-center border-b border-gray-700 pb-4">
            🕌 Aankomende Janaza-gebeden
          </h2>
          <div className="grid gap-6 max-w-5xl mx-auto">
            {services.upcoming.map((service) => (
              <Card
                key={service.id}
                className="bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600 shadow-2xl"
              >
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">🕊️</span>
                        <h3 className="text-3xl font-bold text-white">
                          {service.dossier?.deceased_name || "Onbekend"}
                        </h3>
                      </div>
                      {service.dossier?.deceased_dob && (
                        <p className="text-xl text-gray-300 ml-12">
                          📅 Leeftijd: {getAge(service.dossier.deceased_dob)} jaar
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-600 pt-4 mt-4 space-y-3">
                    <div className="flex items-center gap-3 text-xl">
                      <span className="text-2xl">📅</span>
                      <span className="font-medium">
                        {new Date(service.confirmed_slot!).toLocaleDateString("nl-NL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xl">
                      <span className="text-2xl">🕒</span>
                      <span className="font-medium">
                        {new Date(service.confirmed_slot!).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xl">
                      <span className="text-2xl">📍</span>
                      <span className="font-medium">{mosque.name}</span>
                    </div>
                    {service.note && (
                      <div className="flex items-start gap-3 text-lg text-gray-300 mt-4">
                        <span className="text-2xl">💬</span>
                        <span className="italic">{service.note}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-600 pt-4 mt-6 text-center">
                    <p className="text-lg text-gray-300">
                      🤲 Moge Allah {getPronoun(service.dossier?.deceased_gender)} genadig zijn
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Janaza Prayers */}
      {services?.recent && services.recent.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-center border-b border-gray-700 pb-4 text-gray-300">
            Afgelopen Janaza-gebeden (laatste 3 dagen)
          </h2>
          <div className="grid gap-4 max-w-5xl mx-auto">
            {services.recent.map((service) => (
              <Card
                key={service.id}
                className="bg-gray-800/50 border-gray-700"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {service.dossier?.deceased_name || "Onbekend"}
                      </h3>
                      {service.dossier?.deceased_dob && (
                        <p className="text-sm text-gray-400">
                          Leeftijd: {getAge(service.dossier.deceased_dob)} jaar
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">
                        {new Date(service.confirmed_slot!).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(service.confirmed_slot!).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No services */}
      {(!services?.upcoming || services.upcoming.length === 0) &&
        (!services?.recent || services.recent.length === 0) && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">
              Momenteel geen Janaza-gebeden gepland
            </p>
          </div>
        )}

      {/* Footer */}
      <div className="text-center mt-16 text-gray-500 text-sm">
        <p>Dit scherm vernieuwt automatisch elke minuut</p>
        <p className="mt-2">JanazApp - {new Date().toLocaleString("nl-NL")}</p>
      </div>
    </div>
  );
}
