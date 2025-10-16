import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnreadCounts {
  chat: number;
  documents: number;
  dossiers: number;
  planning: number;
  claims: number;
  directory: number;
  notifications: number;
}

export function useUnreadNotificationsByPage() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    chat: 0,
    documents: 0,
    dossiers: 0,
    planning: 0,
    claims: 0,
    directory: 0,
    notifications: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    fetchUnreadCounts();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`user-notifications-counts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUnreadCounts();
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

  const fetchUnreadCounts = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('type, is_read')
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error || !data) return;

    const counts: UnreadCounts = {
      chat: 0,
      documents: 0,
      dossiers: 0,
      planning: 0,
      claims: 0,
      directory: 0,
      notifications: 0,
    };

    data.forEach((notification: any) => {
      const type = notification.type;
      
      // Chat-related notifications
      if (type === 'NEW_MESSAGE' || type === 'COMMENT_MENTION' || type === 'COMMENT_REPLY') {
        counts.chat++;
      }
      
      // Document-related notifications
      if (type === 'DOCUMENT_UPLOADED' || type === 'FAMILY_DOCUMENT_REQUESTED' || 
          type === 'FAMILY_DOCUMENT_AVAILABLE' || type === 'INSURER_NEW_DOCUMENTS') {
        counts.documents++;
      }
      
      // Dossier-related notifications
      if (type === 'DOSSIER_COMMENT' || type === 'FD_ASSIGNED' || 
          type === 'FAMILY_FD_ACCEPTED' || type === 'FAMILY_FD_REJECTED' || 
          type === 'FAMILY_FD_CLAIMED' || type === 'FAMILY_DOSSIER_COMPLETED' ||
          type === 'MORTUARIUM_DOSSIER_COMPLETED' || type === 'INSURER_NEW_DOSSIER' ||
          type === 'INSURER_DOSSIER_COMPLETED') {
        counts.dossiers++;
      }
      
      // Planning-related notifications
      if (type === 'MORTUARIUM_CONFIRMED' || type === 'MORTUARIUM_REJECTED' ||
          type === 'FAMILY_MORTUARIUM_CONFIRMED' || type === 'FAMILY_MORTUARIUM_REJECTED' ||
          type === 'MORTUARIUM_NEW_RESERVATION' || type === 'MORTUARIUM_RESERVATION_CANCELLED' ||
          type === 'MORTUARIUM_RESERVATION_UPDATED' || type === 'MORTUARIUM_CONFIRMATION_NEEDED') {
        counts.planning++;
      }
      
      // Claims/Insurance-related notifications
      if (type === 'INSURANCE_APPROVED' || type === 'INSURANCE_REJECTED' ||
          type === 'FAMILY_INSURANCE_APPROVED' || type === 'FAMILY_INSURANCE_REJECTED' ||
          type === 'INSURER_VERIFICATION_REQUESTED') {
        counts.claims++;
      }
      
      // Directory/Admin notifications
      if (type === 'ADMIN_NEW_ORG_REGISTRATION' || type === 'ADMIN_NEW_USER_NO_ORG' ||
          type === 'ADMIN_ORG_PENDING_APPROVAL') {
        counts.directory++;
      }
      
      // All admin notifications
      if (type.startsWith('ADMIN_')) {
        counts.notifications++;
      }
    });

    setUnreadCounts(counts);
  };

  return unreadCounts;
}
