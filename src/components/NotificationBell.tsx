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
    deceased_name?: string;
    mortuarium_name?: string;
    sender_name?: string;
    message_preview?: string;
    thread_id?: string;
    message_id?: string;
    document_name?: string;
    fd_name?: string;
    document_type?: string;
    org_name?: string;
    name?: string;
    dossier_ref?: string;
    insurer_name?: string;
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
      
      // FD notifications
      case 'FD_ASSIGNED':
        return t("notifications.fdAssigned", { deceased_name: notification.meta.deceased_name || '' });
      case 'INSURANCE_APPROVED':
        return t("notifications.insuranceApproved", { deceased_name: notification.meta.deceased_name || '' });
      case 'INSURANCE_REJECTED':
        return t("notifications.insuranceRejected");
      case 'MORTUARIUM_CONFIRMED':
        return t("notifications.mortuariumConfirmed", { mortuarium_name: notification.meta.mortuarium_name || '' });
      case 'MORTUARIUM_REJECTED':
        return t("notifications.mortuariumRejected", { mortuarium_name: notification.meta.mortuarium_name || '' });
      case 'DOCUMENT_UPLOADED':
        return t("notifications.documentUploaded", { deceased_name: notification.meta.deceased_name || '' });
      case 'NEW_MESSAGE':
        return t("notifications.newMessage", { 
          sender_name: notification.meta.sender_name || '',
          message_preview: notification.meta.message_preview || ''
        });
      
      // Family notifications
      case 'FAMILY_FD_ACCEPTED':
        return t("notifications.familyFdAccepted", { fd_name: notification.meta.fd_name || '' });
      case 'FAMILY_FD_REJECTED':
        return t("notifications.familyFdRejected", { fd_name: notification.meta.fd_name || '' });
      case 'FAMILY_FD_CLAIMED':
        return t("notifications.familyFdClaimed", { fd_name: notification.meta.fd_name || '' });
      case 'FAMILY_INSURANCE_APPROVED':
        return t("notifications.familyInsuranceApproved", { deceased_name: notification.meta.deceased_name || '' });
      case 'FAMILY_INSURANCE_REJECTED':
        return t("notifications.familyInsuranceRejected");
      case 'FAMILY_MORTUARIUM_CONFIRMED':
        return t("notifications.familyMortuariumConfirmed", { mortuarium_name: notification.meta.mortuarium_name || '' });
      case 'FAMILY_MORTUARIUM_REJECTED':
        return t("notifications.familyMortuariumRejected", { mortuarium_name: notification.meta.mortuarium_name || '' });
      case 'FAMILY_DOCUMENT_REQUESTED':
        return t("notifications.familyDocumentRequested", { 
          fd_name: notification.meta.fd_name || '',
          deceased_name: notification.meta.deceased_name || ''
        });
      case 'FAMILY_DOCUMENT_AVAILABLE':
        return t("notifications.familyDocumentAvailable");
      case 'FAMILY_DOSSIER_COMPLETED':
        return t("notifications.familyDossierCompleted", { deceased_name: notification.meta.deceased_name || '' });
      
      // Mortuarium notifications
      case 'MORTUARIUM_NEW_RESERVATION':
        return t("notifications.mortuariumNewReservation", { deceased_name: notification.meta.deceased_name || '' });
      case 'MORTUARIUM_RESERVATION_CANCELLED':
        return t("notifications.mortuariumReservationCancelled", { 
          deceased_name: notification.meta.deceased_name || '',
          fd_name: notification.meta.fd_name || ''
        });
      case 'MORTUARIUM_RESERVATION_UPDATED':
        return t("notifications.mortuariumReservationUpdated", { 
          deceased_name: notification.meta.deceased_name || '',
          fd_name: notification.meta.fd_name || ''
        });
      case 'MORTUARIUM_CONFIRMATION_NEEDED':
        return t("notifications.mortuariumConfirmationNeeded", { deceased_name: notification.meta.deceased_name || '' });
      case 'MORTUARIUM_DOSSIER_COMPLETED':
        return t("notifications.mortuariumDossierCompleted", { deceased_name: notification.meta.deceased_name || '' });
      
      // Insurer notifications
      case 'INSURER_NEW_DOSSIER':
        return t("notifications.insurerNewDossier", { deceased_name: notification.meta.deceased_name || '' });
      case 'INSURER_VERIFICATION_REQUESTED':
        return t("notifications.insurerVerificationRequested", { 
          fd_name: notification.meta.fd_name || '',
          deceased_name: notification.meta.deceased_name || ''
        });
      case 'INSURER_NEW_DOCUMENTS':
        return t("notifications.insurerNewDocuments", { deceased_name: notification.meta.deceased_name || '' });
      case 'INSURER_DOSSIER_COMPLETED':
        return t("notifications.insurerDossierCompleted", { deceased_name: notification.meta.deceased_name || '' });
      
      // Platform Admin notifications
      case 'ADMIN_NEW_ORG_REGISTRATION':
        return t("notifications.adminNewOrgRegistration", { org_name: notification.meta.org_name || '' });
      case 'ADMIN_NEW_USER_NO_ORG':
        return t("notifications.adminNewUserNoOrg", { name: notification.meta.name || '' });
      case 'ADMIN_ORG_PENDING_APPROVAL':
        return t("notifications.adminOrgPendingApproval", { org_name: notification.meta.org_name || '' });
      case 'ADMIN_DOSSIER_STAGNATION':
        return t("notifications.adminDossierStagnation", { dossier_ref: notification.meta.dossier_ref || '' });
      case 'ADMIN_FD_REJECTED_DOSSIER':
        return t("notifications.adminFdRejectedDossier", { 
          fd_name: notification.meta.fd_name || '',
          dossier_ref: notification.meta.dossier_ref || ''
        });
      case 'ADMIN_NO_FD_AVAILABLE':
        return t("notifications.adminNoFdAvailable", { dossier_ref: notification.meta.dossier_ref || '' });
      case 'ADMIN_INSURANCE_REJECTED':
        return t("notifications.adminInsuranceRejected", { 
          insurer_name: notification.meta.insurer_name || '',
          deceased_name: notification.meta.deceased_name || ''
        });
      case 'ADMIN_MORTUARIUM_REJECTED':
        return t("notifications.adminMortuariumRejected", { 
          mortuarium_name: notification.meta.mortuarium_name || '',
          deceased_name: notification.meta.deceased_name || ''
        });
      
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
