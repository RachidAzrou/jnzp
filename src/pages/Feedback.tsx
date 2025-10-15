import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Feedback() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validToken, setValidToken] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setValidToken(false);
        return;
      }

      const { data, error } = await supabase
        .from("feedback_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .single();

      if (error || !data) {
        setValidToken(false);
      } else if (new Date(data.expires_at) < new Date()) {
        setValidToken(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: t("feedback.ratingRequired"),
        description: t("feedback.selectRating"),
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke("submit-feedback", {
        body: {
          token,
          rating,
          comment: comment.trim() || undefined,
          familyName: familyName.trim() || undefined,
          whatsappPhone: whatsappPhone.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to submit feedback");
      }

      setSubmitted(true);
      toast({
        title: t("feedback.thankYou"),
        description: t("feedback.submittedSuccess"),
      });

      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: t("feedback.submitError"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t("feedback.invalidToken")}</CardTitle>
            <CardDescription>
              {t("feedback.invalidTokenDesc")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t("feedback.thankYou")}</CardTitle>
            <CardDescription>
              {t("feedback.submittedSuccess")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{t("feedback.title")}</CardTitle>
          <CardDescription>
            {t("feedback.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label>{t("feedback.ratingLabel")} *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 5 && t("feedback.excellent")}
                {rating === 4 && t("feedback.good")}
                {rating === 3 && t("feedback.average")}
                {rating === 2 && t("feedback.belowAverage")}
                {rating === 1 && t("feedback.poor")}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">{t("feedback.commentLabel")}</Label>
            <Textarea
              id="comment"
              placeholder={t("feedback.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          {/* Optional: Family name */}
          <div className="space-y-2">
            <Label htmlFor="familyName">{t("feedback.nameLabel")}</Label>
            <Input
              id="familyName"
              placeholder={t("feedback.namePlaceholder")}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("feedback.nameOptional")}
            </p>
          </div>

          {/* Optional: WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">{t("feedback.whatsappLabel")}</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder={t("placeholders.phoneNumber")}
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("feedback.whatsappOptional")}
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? t("feedback.submitting") : t("feedback.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
