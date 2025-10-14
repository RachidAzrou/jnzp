import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { nl, fr, enGB } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Notification {
  id: string;
  type: string;
  meta: {
    dossier_id?: string;
    comment_id?: string;
    ref?: string;
  };
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'fr': return fr;
      case 'en': return enGB;
      default: return nl;
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const fetchNotifications = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('notifications' as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data as any);
      setUnreadCount((data as any[]).filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    // Update notifications directly
    await supabase
      .from('notifications' as any)
      .update({ is_read: true })
      .in('id', notificationIds);

    fetchNotifications();
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead([notification.id]);

    // Navigate to dossier
    if (notification.meta.dossier_id) {
      navigate(`/dossiers/${notification.meta.dossier_id}`);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    await markAsRead(unreadIds);
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'COMMENT_MENTION':
        return t("notifications.commentMention");
      case 'COMMENT_REPLY':
        return t("notifications.commentReply");
      case 'DOSSIER_COMMENT':
        return t("notifications.dossierComment", { ref: notification.meta.ref || '' });
      default:
        return t("notifications.newNotification");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("notifications.noNotifications")}
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                className={`w-full p-4 text-left hover:bg-accent transition-colors border-b ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: getDateLocale()
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
