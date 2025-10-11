import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  isValid: boolean;
  isChecking: boolean;
  error: string | null;
}

export const useBusinessNumberValidation = () => {
  const [validationState, setValidationState] = useState<ValidationResult>({
    isValid: false,
    isChecking: false,
    error: null,
  });

  const validateBusinessNumber = useCallback(async (businessNumber: string) => {
    if (!businessNumber || businessNumber.trim() === '') {
      setValidationState({
        isValid: false,
        isChecking: false,
        error: null,
      });
      return;
    }

    setValidationState({
      isValid: false,
      isChecking: true,
      error: null,
    });

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('business_number', businessNumber.trim())
        .maybeSingle();

      if (error) {
        console.error('Error validating business number:', error);
        setValidationState({
          isValid: false,
          isChecking: false,
          error: 'Kon ondernemingsnummer niet controleren',
        });
        return;
      }

      if (data) {
        setValidationState({
          isValid: false,
          isChecking: false,
          error: `Dit ondernemingsnummer is al geregistreerd voor "${data.name}"`,
        });
      } else {
        setValidationState({
          isValid: true,
          isChecking: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Validation error:', err);
      setValidationState({
        isValid: false,
        isChecking: false,
        error: 'Er is een fout opgetreden bij de validatie',
      });
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationState({
      isValid: false,
      isChecking: false,
      error: null,
    });
  }, []);

  return {
    ...validationState,
    validateBusinessNumber,
    resetValidation,
  };
};
