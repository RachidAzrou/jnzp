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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-8 overflow-hidden">
      {/* Header met moskee info */}
      <div className="text-center mb-16 border-b border-gray-700 pb-8">
        <h1 className="text-6xl font-bold mb-6 tracking-wide">{mosque.name}</h1>
        <div className="text-3xl text-emerald-300 mb-3 font-arabic" style={{ fontFamily: 'Traditional Arabic, serif' }}>
          إِنَّا لِلّهِ وَإِنَّـا إِلَيْهِ رَاجِعونَ
        </div>
        <p className="text-xl text-gray-300 italic">
          Voorwaar, wij behoren Allah toe en tot Hem keren wij terug
        </p>
      </div>

      {/* Upcoming Janaza Prayers */}
      {services?.upcoming && services.upcoming.length > 0 && (
        <div className="mb-16">
          <h2 className="text-4xl font-semibold mb-8 text-center pb-6 flex items-center justify-center gap-4">
            <span className="text-5xl">🕌</span>
            <span>Aankomende Janaza-gebeden</span>
          </h2>
          <div className="grid gap-8 max-w-6xl mx-auto">
            {services.upcoming.map((service) => (
              <Card
                key={service.id}
                className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 border-2 border-emerald-700/30 shadow-2xl backdrop-blur"
              >
                <CardContent className="p-10">
                  {/* Overledene info */}
                  <div className="mb-6 pb-6 border-b border-gray-700/50">
                    <div className="flex items-start gap-4">
                      <span className="text-5xl">🕊️</span>
                      <div className="flex-1">
                        <h3 className="text-4xl font-bold text-white mb-3">
                          {service.dossier?.deceased_name || "Onbekend"}
                        </h3>
                        {service.dossier?.deceased_dob && (
                          <p className="text-2xl text-emerald-200">
                            Leeftijd: {getAge(service.dossier.deceased_dob)} jaar
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tijd en locatie info */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-4 text-2xl bg-gray-900/50 p-4 rounded-lg">
                      <span className="text-3xl">📅</span>
                      <span className="font-semibold text-white">
                        {new Date(service.confirmed_slot!).toLocaleDateString("nl-NL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-2xl bg-gray-900/50 p-4 rounded-lg">
                      <span className="text-3xl">🕒</span>
                      <span className="font-semibold text-white">
                        {new Date(service.confirmed_slot!).toLocaleTimeString("nl-NL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-2xl bg-gray-900/50 p-4 rounded-lg">
                      <span className="text-3xl">📍</span>
                      <span className="font-semibold text-white">{mosque.name}</span>
                    </div>
                    {service.note && (
                      <div className="flex items-start gap-4 text-xl text-emerald-200 bg-emerald-950/30 p-4 rounded-lg border border-emerald-800/30">
                        <span className="text-2xl">💬</span>
                        <span className="italic">{service.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Dua */}
                  <div className="border-t border-emerald-700/30 pt-6 text-center">
                    <p className="text-2xl text-emerald-100 italic">
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
        <div className="border-t-4 border-gray-800 pt-12">
          <h2 className="text-3xl font-semibold mb-8 text-center pb-4 text-gray-400">
            Afgelopen Janaza-gebeden (laatste 3 dagen)
          </h2>
          <div className="grid gap-4 max-w-6xl mx-auto">
            {services.recent.map((service) => (
              <Card
                key={service.id}
                className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl opacity-60">🕊️</span>
                      <div>
                        <h3 className="text-2xl font-semibold text-gray-200">
                          {service.dossier?.deceased_name || "Onbekend"}
                        </h3>
                        {service.dossier?.deceased_dob && (
                          <p className="text-lg text-gray-400">
                            Leeftijd: {getAge(service.dossier.deceased_dob)} jaar
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-300">
                        {new Date(service.confirmed_slot!).toLocaleDateString("nl-NL", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      <p className="text-lg text-gray-400">
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
          <div className="text-center py-32">
            <div className="text-8xl mb-8 opacity-20">🕌</div>
            <p className="text-3xl text-gray-400 mb-4">
              Momenteel geen Janaza-gebeden gepland
            </p>
            <p className="text-xl text-gray-500">
              إِنَّا لِلّهِ وَإِنَّـا إِلَيْهِ رَاجِعونَ
            </p>
          </div>
        )}

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-4 text-gray-500 text-base">
          <span>⟳ Auto-refresh elke minuut</span>
          <span>•</span>
          <span>JanazApp</span>
          <span>•</span>
          <span>{new Date().toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
    </div>
  );
}
