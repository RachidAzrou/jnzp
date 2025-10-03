import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface InvitationResult {
  success: boolean;
  organizationId?: string;
  role?: string;
  error?: string;
}

export const useInvitation = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const acceptInvitation = async (code: string): Promise<InvitationResult> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Gebruiker niet ingelogd');
      }

      const { data, error } = await supabase.rpc('accept_invitation', {
        p_code: code,
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Uitnodiging ongeldig',
        };
      }

      toast({
        title: 'Uitnodiging geaccepteerd',
        description: `U bent toegevoegd aan de organisatie als ${result.role}`,
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 1500);

      return {
        success: true,
        organizationId: result.organization_id,
        role: result.role,
      };
    } catch (error: any) {
      toast({
        title: 'Fout bij accepteren uitnodiging',
        description: error.message,
        variant: 'destructive',
      });
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  const validateInvitation = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('invitation_links')
        .select('*')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return false;
      }

      // Check if max uses reached
      if (data.max_uses && data.current_uses >= data.max_uses) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Invitation validation error:', error);
      return false;
    }
  };

  return {
    acceptInvitation,
    validateInvitation,
    loading,
  };
};
