import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Review {
  id: string;
  dossier_id: string;
  rating: number;
  comment: string | null;
  family_name: string | null;
  created_at: string;
  dossiers: {
    display_id: string;
    deceased_name: string;
    flow: string;
  };
}

export default function FDBeoordelingen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [flowFilter, setFlowFilter] = useState("all");
  const [minRating, setMinRating] = useState("all");
  const [onlyWithComments, setOnlyWithComments] = useState(false);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "funeral_director")
        .single();

      if (!userRole?.organization_id) return;

      const { data, error } = await supabase
        .from("fd_reviews")
        .select(`
          *,
          dossiers!inner (
            display_id,
            deceased_name,
            flow
          )
        `)
        .eq("fd_org_id", userRole.organization_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating
            ? "fill-warning text-warning"
            : "fill-muted text-muted"
        }`}
      />
    ));
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.family_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.dossiers.display_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.dossiers.deceased_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFlow = flowFilter === "all" || review.dossiers.flow === flowFilter;
    const matchesRating = minRating === "all" || review.rating >= parseInt(minRating);
    const matchesComments = !onlyWithComments || (review.comment && review.comment.trim() !== "");
    
    return matchesSearch && matchesFlow && matchesRating && matchesComments;
  });

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  if (loading) {
    return <div className="p-6">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-card to-muted/30 animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2 flex-1 min-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Feedback</p>
                  <h1 className="text-2xl font-bold tracking-tight">Beoordelingen</h1>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pl-15">
                Feedback van families na afsluiting van een uitvaart
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gemiddelde Beoordeling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{avgRating}</span>
                <Star className="h-6 w-6 fill-warning text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totaal Beoordelingen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reviews.length}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Met Opmerking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {reviews.filter(r => r.comment && r.comment.trim() !== "").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder={t("placeholders.searchFamilyDossier")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={flowFilter} onValueChange={setFlowFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  <SelectItem value="LOC">Lokaal</SelectItem>
                  <SelectItem value="REP">Repatriëring</SelectItem>
                </SelectContent>
              </Select>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger>
                  <SelectValue placeholder={t("placeholders.minStars")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle sterren</SelectItem>
                  <SelectItem value="5">5 sterren</SelectItem>
                  <SelectItem value="4">4+ sterren</SelectItem>
                  <SelectItem value="3">3+ sterren</SelectItem>
                  <SelectItem value="2">2+ sterren</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithComments}
                  onChange={(e) => setOnlyWithComments(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Alleen met opmerking</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm animate-fade-in">
          <CardHeader>
            <CardTitle>Alle Beoordelingen ({filteredReviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Er zijn nog geen beoordelingen ontvangen die aan deze filters voldoen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <Badge variant={review.dossiers.flow === "REP" ? "default" : "secondary"}>
                          {review.dossiers.flow === "REP" ? "Repatriëring" : "Lokaal"}
                        </Badge>
                      </div>
                      <div>
                        <button
                          onClick={() => navigate(`/dossiers/${review.dossier_id}`)}
                          className="font-medium hover:underline text-left"
                        >
                          {review.dossiers.deceased_name}
                        </button>
                        <p className="text-sm text-muted-foreground">
                          Dossier: {review.dossiers.display_id}
                          {review.family_name && ` • Familie: ${review.family_name}`}
                        </p>
                      </div>
                      {review.comment && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground italic line-clamp-2">
                            "{review.comment}"
                          </p>
                          {review.comment.length > 100 && (
                            <button
                              onClick={() => setSelectedComment(review.comment)}
                              className="text-xs text-primary hover:underline mt-1"
                            >
                              Lees meer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>

        {/* Comment Dialog */}
        <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Volledige Opmerking</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground italic">"{selectedComment}"</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
