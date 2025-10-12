import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit2, Save, X } from "lucide-react";

interface FamilyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string | null;
}

interface EditableFamilyContactsProps {
  dossierId: string;
  contacts: FamilyContact[];
  onUpdate: () => void;
}

export function EditableFamilyContacts({ dossierId, contacts, onUpdate }: EditableFamilyContactsProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editData, setEditData] = useState<Partial<FamilyContact>>({});

  const handleEdit = (contact: FamilyContact) => {
    setEditingId(contact.id);
    setEditData(contact);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editData.name) {
      toast({ title: "Naam is verplicht", variant: "destructive" });
      return;
    }

    try {
      if (isAdding) {
        const { error } = await supabase
          .from("family_contacts")
          .insert([{ ...editData, dossier_id: dossierId, name: editData.name }]);
        
        if (error) throw error;
        toast({ title: "Contact toegevoegd" });
      } else if (editingId) {
        const { error } = await supabase
          .from("family_contacts")
          .update(editData)
          .eq("id", editingId);
        
        if (error) throw error;
        toast({ title: "Contact bijgewerkt" });
      }
      
      handleCancel();
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je dit contact wilt verwijderen?")) return;
    
    try {
      const { error } = await supabase
        .from("family_contacts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Contact verwijderd" });
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Familie & Contacten</CardTitle>
            <CardDescription>Beheer familieleden en contactpersonen</CardDescription>
          </div>
          <Button 
            onClick={() => setIsAdding(true)} 
            size="sm" 
            variant="ghost"
            className="h-8 gap-1 text-xs"
            disabled={isAdding}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Toevoegen</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <div className="rounded-lg border bg-accent/5 p-4 space-y-3 animate-scale-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Naam *</Label>
                <Input
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Relatie</Label>
                <Input
                  value={editData.relationship || ""}
                  onChange={(e) => setEditData({ ...editData, relationship: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefoon</Label>
                <Input
                  value={editData.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="h-8 text-xs">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Opslaan
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="h-8 text-xs">
                <X className="h-3.5 w-3.5 mr-1.5" />
                Annuleren
              </Button>
            </div>
          </div>
        )}

        {contacts.map((contact) => (
          <div 
            key={contact.id} 
            className="group rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-sm"
          >
            {editingId === contact.id ? (
              <div className="space-y-3 animate-scale-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Naam *</Label>
                    <Input
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Relatie</Label>
                    <Input
                      value={editData.relationship || ""}
                      onChange={(e) => setEditData({ ...editData, relationship: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefoon</Label>
                    <Input
                      value={editData.phone || ""}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={editData.email || ""}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="h-8 text-xs">
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Opslaan
                  </Button>
                  <Button onClick={handleCancel} variant="ghost" size="sm" className="h-8 text-xs">
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="font-medium text-sm">{contact.name}</div>
                  {contact.relationship && (
                    <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                  )}
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {contact.phone && <span>{contact.phone}</span>}
                    {contact.email && <span className="truncate">{contact.email}</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    onClick={() => handleEdit(contact)} 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    onClick={() => handleDelete(contact.id)} 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {contacts.length === 0 && !isAdding && (
          <div className="text-center text-muted-foreground py-8 text-sm animate-fade-in">
            Nog geen contacten toegevoegd
          </div>
        )}
      </CardContent>
    </Card>
  );
}

