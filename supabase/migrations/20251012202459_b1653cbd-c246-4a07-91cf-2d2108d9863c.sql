-- =====================================================
-- JanazApp Dossierflow: Realistische Flow met Blokkades
-- =====================================================

-- 1. Voeg insurer_hold velden toe aan dossiers
ALTER TABLE public.dossiers
ADD COLUMN IF NOT EXISTS insurer_hold boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS insurer_hold_reason text,
ADD COLUMN IF NOT EXISTS insurer_hold_set_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS insurer_hold_set_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS insurer_hold_contact_person text,
ADD COLUMN IF NOT EXISTS insurer_hold_reference text;

-- 2. Maak tabel voor hold events (audit trail)
CREATE TABLE IF NOT EXISTS public.dossier_hold_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  hold_type text NOT NULL CHECK (hold_type IN ('LEGAL', 'INSURER')),
  action text NOT NULL CHECK (action IN ('SET', 'LIFTED', 'REQUESTED_LIFT')),
  reason text,
  contact_person text,
  reference text,
  set_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.dossier_hold_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FD and insurers can view hold events"
ON public.dossier_hold_events FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director') OR 
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'insurer')
);

CREATE POLICY "System can insert hold events"
ON public.dossier_hold_events FOR INSERT
WITH CHECK (true);

-- 3. Index voor betere performance
CREATE INDEX IF NOT EXISTS idx_dossier_hold_events_dossier 
ON public.dossier_hold_events(dossier_id);

CREATE INDEX IF NOT EXISTS idx_dossiers_holds 
ON public.dossiers(legal_hold, insurer_hold) 
WHERE legal_hold = true OR insurer_hold = true;

-- 4. Functie om te checken of dossier geblokkeerd is
CREATE OR REPLACE FUNCTION public.is_dossier_blocked(p_dossier_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier RECORD;
  v_result jsonb;
BEGIN
  SELECT legal_hold, insurer_hold, 
         legal_hold_reason, insurer_hold_reason,
         legal_hold_authority, insurer_hold_contact_person
  INTO v_dossier
  FROM dossiers
  WHERE id = p_dossier_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('blocked', false);
  END IF;
  
  IF v_dossier.legal_hold THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'type', 'LEGAL_HOLD',
      'reason', v_dossier.legal_hold_reason,
      'authority', v_dossier.legal_hold_authority,
      'message', 'Geblokkeerd door overheid/parket'
    );
  END IF;
  
  IF v_dossier.insurer_hold THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'type', 'INSURER_HOLD',
      'reason', v_dossier.insurer_hold_reason,
      'contact', v_dossier.insurer_hold_contact_person,
      'message', 'Geblokkeerd door verzekeraar'
    );
  END IF;
  
  RETURN jsonb_build_object('blocked', false);
END;
$$;

-- 5. Functie om hold te zetten
CREATE OR REPLACE FUNCTION public.set_dossier_hold(
  p_dossier_id uuid,
  p_hold_type text,
  p_reason text,
  p_contact_person text DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role app_role;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permissies
  IF p_hold_type = 'LEGAL' THEN
    IF NOT has_role(v_user_id, 'admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Alleen admins kunnen juridische blokkades zetten');
    END IF;
    
    UPDATE dossiers
    SET legal_hold = true,
        legal_hold_reason = p_reason,
        legal_hold_authority = p_contact_person,
        legal_hold_case_number = p_reference,
        legal_hold_prev_status = status::text
    WHERE id = p_dossier_id;
    
  ELSIF p_hold_type = 'INSURER' THEN
    -- Check of user verzekeraar is voor dit dossier
    IF NOT EXISTS (
      SELECT 1 FROM dossiers d
      JOIN user_roles ur ON ur.organization_id = d.insurer_org_id
      WHERE d.id = p_dossier_id 
        AND ur.user_id = v_user_id 
        AND ur.role = 'insurer'
    ) AND NOT has_role(v_user_id, 'admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Alleen de gekoppelde verzekeraar kan deze blokkade zetten');
    END IF;
    
    UPDATE dossiers
    SET insurer_hold = true,
        insurer_hold_reason = p_reason,
        insurer_hold_contact_person = p_contact_person,
        insurer_hold_reference = p_reference,
        insurer_hold_set_by = v_user_id,
        insurer_hold_set_at = now()
    WHERE id = p_dossier_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Ongeldig hold type');
  END IF;
  
  -- Log event
  INSERT INTO dossier_hold_events (
    dossier_id, hold_type, action, reason, contact_person, reference, set_by
  ) VALUES (
    p_dossier_id, p_hold_type, 'SET', p_reason, p_contact_person, p_reference, v_user_id
  );
  
  -- Audit log
  INSERT INTO audit_events (
    user_id, event_type, target_type, target_id, dossier_id, description, reason, metadata
  ) VALUES (
    v_user_id, 
    'DOSSIER_HOLD_SET', 
    'Dossier', 
    p_dossier_id, 
    p_dossier_id,
    'Dossier blokkade gezet: ' || p_hold_type,
    p_reason,
    jsonb_build_object(
      'hold_type', p_hold_type,
      'contact_person', p_contact_person,
      'reference', p_reference
    )
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Functie om hold op te heffen
CREATE OR REPLACE FUNCTION public.lift_dossier_hold(
  p_dossier_id uuid,
  p_hold_type text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check permissies (zelfde als set_dossier_hold)
  IF p_hold_type = 'LEGAL' THEN
    IF NOT has_role(v_user_id, 'admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Alleen admins kunnen juridische blokkades opheffen');
    END IF;
    
    UPDATE dossiers
    SET legal_hold = false,
        legal_hold_reason = NULL,
        legal_hold_authority = NULL,
        legal_hold_case_number = NULL
    WHERE id = p_dossier_id;
    
  ELSIF p_hold_type = 'INSURER' THEN
    IF NOT EXISTS (
      SELECT 1 FROM dossiers d
      JOIN user_roles ur ON ur.organization_id = d.insurer_org_id
      WHERE d.id = p_dossier_id 
        AND ur.user_id = v_user_id 
        AND ur.role = 'insurer'
    ) AND NOT has_role(v_user_id, 'admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Alleen de gekoppelde verzekeraar kan deze blokkade opheffen');
    END IF;
    
    UPDATE dossiers
    SET insurer_hold = false,
        insurer_hold_reason = NULL,
        insurer_hold_contact_person = NULL,
        insurer_hold_reference = NULL,
        insurer_hold_set_by = NULL,
        insurer_hold_set_at = NULL
    WHERE id = p_dossier_id;
  END IF;
  
  -- Log event
  INSERT INTO dossier_hold_events (
    dossier_id, hold_type, action, reason, set_by
  ) VALUES (
    p_dossier_id, p_hold_type, 'LIFTED', p_reason, v_user_id
  );
  
  -- Audit log
  INSERT INTO audit_events (
    user_id, event_type, target_type, target_id, dossier_id, description, reason
  ) VALUES (
    v_user_id, 
    'DOSSIER_HOLD_LIFTED', 
    'Dossier', 
    p_dossier_id, 
    p_dossier_id,
    'Dossier blokkade opgeheven: ' || p_hold_type,
    p_reason
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;