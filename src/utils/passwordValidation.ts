import { supabase } from '@/integrations/supabase/client';

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength?: string;
}

export const validatePassword = async (password: string): Promise<PasswordValidationResult> => {
  // Client-side basic validation
  if (password.length < 12) {
    return {
      valid: false,
      error: 'Wachtwoord moet minimaal 12 tekens lang zijn'
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const characterTypes = [hasUppercase, hasLowercase, hasDigit, hasSpecial].filter(Boolean).length;

  if (characterTypes < 3) {
    return {
      valid: false,
      error: 'Wachtwoord moet minimaal 3 van de volgende bevatten: hoofdletter, kleine letter, cijfer, speciaal teken'
    };
  }

  // Server-side validation (includes breached password check)
  try {
    const { data, error } = await supabase.rpc('validate_password_strength', {
      password: password
    });

    if (error) {
      console.error('Password validation error:', error);
      return {
        valid: false,
        error: 'Fout bij wachtwoordvalidatie'
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        error: 'Onverwacht antwoord van server'
      };
    }

    return data as unknown as PasswordValidationResult;
  } catch (error) {
    console.error('Password validation error:', error);
    return {
      valid: false,
      error: 'Fout bij wachtwoordvalidatie'
    };
  }
};

export const getPasswordStrengthColor = (strength?: string): string => {
  switch (strength) {
    case 'weak':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'strong':
      return 'text-success';
    default:
      return 'text-muted-foreground';
  }
};

export const getPasswordRequirements = () => {
  return [
    'Minimaal 12 tekens',
    'Minimaal 3 van de volgende:',
    '  • Hoofdletters (A-Z)',
    '  • Kleine letters (a-z)',
    '  • Cijfers (0-9)',
    '  • Speciale tekens (!@#$%...)'
  ];
};
