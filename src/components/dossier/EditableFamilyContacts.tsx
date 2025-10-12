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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Familie & Contacten</CardTitle>
            <CardDescription>Beheer familieleden en contactpersonen</CardDescription>
          </div>
          <Button onClick={() => setIsAdding(true)} size="sm" disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Toevoegen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Naam *</Label>
                <Input
                  value={editData.name || ""}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Relatie</Label>
                <Input
                  value={editData.relationship || ""}
                  onChange={(e) => setEditData({ ...editData, relationship: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input
                  value={editData.phone || ""}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email || ""}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Annuleren
              </Button>
            </div>
          </div>
        )}

        {contacts.map((contact) => (
          <div key={contact.id} className="border rounded-lg p-4">
            {editingId === contact.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Naam *</Label>
                    <Input
                      value={editData.name || ""}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Relatie</Label>
                    <Input
                      value={editData.relationship || ""}
                      onChange={(e) => setEditData({ ...editData, relationship: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Telefoon</Label>
                    <Input
                      value={editData.phone || ""}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editData.email || ""}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Opslaan
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Annuleren
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{contact.name}</div>
                  {contact.relationship && (
                    <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                  )}
                  {contact.phone && (
                    <div className="text-sm text-muted-foreground">Tel: {contact.phone}</div>
                  )}
                  {contact.email && (
                    <div className="text-sm text-muted-foreground">Email: {contact.email}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(contact)} variant="outline" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleDelete(contact.id)} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {contacts.length === 0 && !isAdding && (
          <div className="text-center text-muted-foreground py-8">
            Nog geen contacten toegevoegd
          </div>
        )}
      </CardContent>
    </Card>
  );
}
