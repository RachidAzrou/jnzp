import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Mail, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminNotificationTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .order("trigger_event", { ascending: true });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    const { error } = editingTemplate.id
      ? await supabase
          .from("notification_templates")
          .update(editingTemplate)
          .eq("id", editingTemplate.id)
      : await supabase
          .from("notification_templates")
          .insert(editingTemplate);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Opgeslagen",
        description: "Template succesvol opgeslagen",
      });
      setDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet u zeker dat u deze template wilt verwijderen?")) return;

    const { error } = await supabase
      .from("notification_templates")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verwijderd",
        description: "Template succesvol verwijderd",
      });
      fetchTemplates();
    }
  };

  const newTemplate = () => {
    setEditingTemplate({
      trigger_event: "",
      channel: "BOTH",
      recipient_type: "FAMILY",
      subject: "",
      template_nl: "",
      template_fr: "",
      template_en: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const editTemplate = (template: any) => {
    setEditingTemplate({ ...template });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificatie Templates</h1>
          <p className="text-muted-foreground">
            Beheer geautomatiseerde berichten naar stakeholders
          </p>
        </div>
        <Button onClick={newTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Nieuwe Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    {template.trigger_event}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {template.recipient_type}
                    </Badge>
                    <Badge variant="secondary">
                      <Mail className="mr-1 h-3 w-3" />
                      {template.channel}
                    </Badge>
                    <Badge
                      variant={template.is_active ? "default" : "secondary"}
                    >
                      {template.is_active ? "Actief" : "Inactief"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {template.subject && (
                <p className="text-sm font-medium mb-2">
                  Onderwerp: {template.subject}
                </p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {template.template_nl}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "Template Bewerken" : "Nieuwe Template"}
            </DialogTitle>
            <DialogDescription>
              Configureer een notificatie template. Gebruik placeholders zoals {"{family_name}"}, {"{deceased_name}"}, {"{fd_name}"}.
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Trigger Event *</Label>
                <Input
                  value={editingTemplate.trigger_event}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      trigger_event: e.target.value,
                    })
                  }
                  placeholder="STATUS_DOCS_VERIFIED"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Ontvanger Type *</Label>
                  <Select
                    value={editingTemplate.recipient_type}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        recipient_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FAMILY">Familie</SelectItem>
                      <SelectItem value="FD">Uitvaartondernemer</SelectItem>
                      <SelectItem value="INSURER">Verzekeraar</SelectItem>
                      <SelectItem value="WASPLAATS">Wasplaats</SelectItem>
                      <SelectItem value="MOSQUE">Moskee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Kanaal *</Label>
                  <Select
                    value={editingTemplate.channel}
                    onValueChange={(value) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        channel: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="BOTH">Beide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-8">
                  <Switch
                    checked={editingTemplate.is_active}
                    onCheckedChange={(checked) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        is_active: checked,
                      })
                    }
                  />
                  <Label>Actief</Label>
                </div>
              </div>

              <div>
                <Label>Onderwerp (optioneel voor email)</Label>
                <Input
                  value={editingTemplate.subject || ""}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      subject: e.target.value,
                    })
                  }
                />
              </div>

              <Tabs defaultValue="nl">
                <TabsList>
                  <TabsTrigger value="nl">Nederlands</TabsTrigger>
                  <TabsTrigger value="fr">Frans</TabsTrigger>
                  <TabsTrigger value="en">Engels</TabsTrigger>
                </TabsList>

                <TabsContent value="nl" className="space-y-2">
                  <Label>Template Nederlands *</Label>
                  <Textarea
                    value={editingTemplate.template_nl}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_nl: e.target.value,
                      })
                    }
                    rows={8}
                  />
                </TabsContent>

                <TabsContent value="fr" className="space-y-2">
                  <Label>Template Frans</Label>
                  <Textarea
                    value={editingTemplate.template_fr || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_fr: e.target.value,
                      })
                    }
                    rows={8}
                  />
                </TabsContent>

                <TabsContent value="en" className="space-y-2">
                  <Label>Template Engels</Label>
                  <Textarea
                    value={editingTemplate.template_en || ""}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        template_en: e.target.value,
                      })
                    }
                    rows={8}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingTemplate(null);
              }}
            >
              Annuleren
            </Button>
            <Button onClick={handleSave}>Opslaan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
