import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Mail, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";

export function NotificationLog() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notification_log")
      .select("*, dossiers(display_id, deceased_name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === "EMAIL" ? (
      <Mail className="h-4 w-4" />
    ) : (
      <MessageSquare className="h-4 w-4" />
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificaties Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaties Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Geen notificaties gevonden
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="flex gap-2 mt-1">
                  {getStatusIcon(notification.status)}
                  {getChannelIcon(notification.channel)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {notification.dossiers?.deceased_name || "Onbekend"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {notification.dossiers?.display_id}
                    </Badge>
                    <Badge
                      variant={
                        notification.status === "DELIVERED"
                          ? "default"
                          : notification.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {notification.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notification.recipient_type} • {notification.recipient_contact}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(notification.created_at), "PPp", {
                      locale: nl,
                    })}
                  </p>
                  {notification.error_message && (
                    <p className="text-xs text-red-500">
                      {notification.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
