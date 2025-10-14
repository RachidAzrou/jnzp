import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Edit2, Save, X } from "lucide-react";

interface EditableObituaryCardProps {
  dossierId: string;
  initialObituary: string | null;
  onUpdate: () => void;
}

export function EditableObituaryCard({ dossierId, initialObituary, onUpdate }: EditableObituaryCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [obituary, setObituary] = useState(initialObituary || "");

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("dossiers")
        .update({ obituary: obituary || null })
        .eq("id", dossierId);
      
      if (error) throw error;
      
      toast({ title: t("obituary.saved") });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: t("obituary.saveError"), variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setObituary(initialObituary || "");
    setIsEditing(false);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("obituary.title")}</CardTitle>
            <CardDescription>{t("obituary.editDescription")}</CardDescription>
          </div>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)} 
              variant="ghost" 
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("obituary.edit")}</span>
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button onClick={handleSave} size="sm" className="h-8 text-xs">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">{t("obituary.save")}</span>
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="h-8 text-xs">
                <X className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden sm:inline">{t("obituary.cancel")}</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="transition-all duration-200">
        {isEditing ? (
            <Textarea
              value={obituary}
              onChange={(e) => setObituary(e.target.value)}
              placeholder={t("forms.placeholders.obituaryText")}
              className="min-h-[200px] animate-scale-in"
            />
        ) : (
          <div className="prose prose-sm max-w-none animate-fade-in">
            {obituary ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{obituary}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">{t("obituary.noObituary")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

