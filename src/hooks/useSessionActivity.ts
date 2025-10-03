import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export const useSessionActivity = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Get current session token
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        sessionTokenRef.current = session.access_token;
      }
    };
    
    initSession();

    // Update last activity on user interactions
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen to user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check inactivity periodically
    const checkInactivity = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        await supabase.auth.signOut();
        
        toast({
          title: "Sessie verlopen",
          description: "U bent automatisch uitgelogd na 12 uur inactiviteit.",
          variant: "destructive",
        });
        
        navigate('/auth');
        clearInterval(checkInactivity);
      } else if (sessionTokenRef.current) {
        // Update session activity in database
        try {
          await supabase.rpc('update_session_activity', {
            p_session_token: sessionTokenRef.current
          });
        } catch (error) {
          console.error('Failed to update session activity:', error);
        }
      }
    }, ACTIVITY_CHECK_INTERVAL);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(checkInactivity);
    };
  }, [toast, navigate]);
};
