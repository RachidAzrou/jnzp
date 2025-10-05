import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TestTube } from "lucide-react";

const AVAILABLE_EVENTS = [
  'DOSSIER_CREATED',
  'DOSSIER_STATUS_CHANGED',
  'DOCUMENT_UPLOADED',
  'INVOICE_CREATED',
  'FEEDBACK_SUBMITTED',
];

export default function AdminWebhooks() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: crypto.randomUUID(),
  });

  useEffect(() => {
    fetchOrgAndData();
  }, []);

  const fetchOrgAndData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (roles?.organization_id) {
      setOrgId(roles.organization_id);
      await Promise.all([
        fetchWebhooks(roles.organization_id),
        fetchDeliveries(roles.organization_id),
      ]);
    }
    setLoading(false);
  };

  const fetchWebhooks = async (organizationId: string) => {
    const { data, error } = await supabase
      .from('webhooks' as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: t('common.error'),
        description: t('webhooks.errorLoading'),
        variant: "destructive",
      });
      return;
    }

    setWebhooks(data || []);
  };

  const fetchDeliveries = async (organizationId: string) => {
    const { data: orgWebhooks } = await supabase
      .from('webhooks' as any)
      .select('id')
      .eq('organization_id', organizationId);

    if (!orgWebhooks) return;

    const webhookIds = orgWebhooks.map((w: any) => w.id);

    const { data, error } = await supabase
      .from('webhook_deliveries' as any)
      .select('*, webhooks(name)')
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) {
      setDeliveries(data || []);
    }
  };

  const createWebhook = async () => {
    if (!orgId || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast({
        title: t('common.error'),
        description: t('webhooks.fillRequired'),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from('webhooks' as any).insert({
      organization_id: orgId,
      name: newWebhook.name,
      url: newWebhook.url,
      events: newWebhook.events,
      secret: newWebhook.secret,
    });

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: t('common.success'), description: t('webhooks.webhookCreated') });
    setDialogOpen(false);
    setNewWebhook({ name: '', url: '', events: [], secret: crypto.randomUUID() });
    if (orgId) fetchWebhooks(orgId);
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('webhooks' as any)
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
      return;
    }

    toast({ 
      title: t('common.success'), 
      description: `${t('webhooks.webhook')} ${!isActive ? t('webhooks.webhookEnabled') : t('webhooks.webhookDisabled')}` 
    });
    if (orgId) fetchWebhooks(orgId);
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase.from('webhooks' as any).delete().eq('id', id);

    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: t('common.success'), description: t('webhooks.webhookDeleted') });
    if (orgId) fetchWebhooks(orgId);
  };

  const testWebhook = async (webhook: any) => {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret,
        },
        body: JSON.stringify({
          event_type: 'TEST',
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      toast({
        title: response.ok ? t('common.success') : t('common.error'),
        description: `${t('webhooks.testWebhook')} returned ${response.status}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('webhooks.title')}</h1>
          <p className="text-muted-foreground">{t('webhooks.description')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('webhooks.newWebhook')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('webhooks.createWebhook')}</DialogTitle>
              <DialogDescription>
                {t('webhooks.createWebhookDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('webhooks.name')}</Label>
                <Input
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="My Integration"
                />
              </div>
              <div>
                <Label>{t('webhooks.url')}</Label>
                <Input
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://api.example.com/webhook"
                />
              </div>
              <div>
                <Label>{t('webhooks.secret')}</Label>
                <Input value={newWebhook.secret} disabled />
              </div>
              <div>
                <Label>{t('webhooks.events')}</Label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        checked={newWebhook.events.includes(event)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] });
                          } else {
                            setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== event) });
                          }
                        }}
                      />
                      <Label className="font-normal">{event}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={createWebhook}>{t('common.create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('webhooks.activeWebhooks')}</CardTitle>
          <CardDescription>{t('webhooks.manageEndpoints')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('webhooks.name')}</TableHead>
                <TableHead>{t('webhooks.url')}</TableHead>
                <TableHead>{t('webhooks.events')}</TableHead>
                <TableHead>{t('webhooks.status')}</TableHead>
                <TableHead>{t('webhooks.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event: string) => (
                        <Badge key={event} variant="secondary" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={() => toggleWebhook(webhook.id, webhook.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhook)}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {webhooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('webhooks.noWebhooks')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('webhooks.recentDeliveries')}</CardTitle>
          <CardDescription>{t('webhooks.last50Deliveries')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('webhooks.webhook')}</TableHead>
                <TableHead>{t('webhooks.event')}</TableHead>
                <TableHead>{t('webhooks.status')}</TableHead>
                <TableHead>{t('webhooks.time')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>{(delivery.webhooks as any)?.name || 'Unknown'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{delivery.event_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {delivery.response_status ? (
                      <Badge variant={delivery.response_status < 300 ? "default" : "destructive"}>
                        {delivery.response_status}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(delivery.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {deliveries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t('webhooks.noDeliveries')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
