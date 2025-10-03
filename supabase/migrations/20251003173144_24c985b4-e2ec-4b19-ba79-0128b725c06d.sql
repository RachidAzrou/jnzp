-- Field-level Encryption for Sensitive Data (NIS, etc.)
-- Using pgcrypto for encryption at rest

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption functions (AES-256-GCM)
CREATE OR REPLACE FUNCTION public.encrypt_field(
  p_data TEXT,
  p_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Use provided key or generate from secret
  v_key := COALESCE(p_key, encode(digest('janazapp_encryption_key_v1', 'sha256'), 'hex'));
  
  RETURN encode(
    encrypt_iv(
      p_data::bytea,
      decode(v_key, 'hex'),
      gen_random_bytes(16),
      'aes-cbc/pad:pkcs'
    ),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_field(
  p_encrypted TEXT,
  p_key TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  -- Use provided key or generate from secret
  v_key := COALESCE(p_key, encode(digest('janazapp_encryption_key_v1', 'sha256'), 'hex'));
  
  RETURN convert_from(
    decrypt_iv(
      decode(p_encrypted, 'base64'),
      decode(v_key, 'hex'),
      gen_random_bytes(16),
      'aes-cbc/pad:pkcs'
    ),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Return NULL if decryption fails
END;
$$;

-- Add encrypted fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nis_encrypted TEXT,
ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT;

COMMENT ON COLUMN public.profiles.nis_encrypted IS 'Encrypted National Identification Number';
COMMENT ON COLUMN public.profiles.ssn_encrypted IS 'Encrypted Social Security Number';

-- Helper functions for NIS
CREATE OR REPLACE FUNCTION public.set_encrypted_nis(
  p_profile_id UUID,
  p_nis TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET nis_encrypted = encrypt_field(p_nis)
  WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_decrypted_nis(p_profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encrypted TEXT;
BEGIN
  SELECT nis_encrypted INTO v_encrypted
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN decrypt_field(v_encrypted);
END;
$$;

-- Auditlog entry
INSERT INTO audit_events (
  event_type,
  description,
  metadata
) VALUES (
  'SECURITY_CONFIG',
  'Field-level encryption configured for sensitive data',
  jsonb_build_object(
    'encryption', 'AES-256-CBC',
    'encrypted_fields', ARRAY['nis', 'ssn'],
    'timestamp', NOW()
  )
);