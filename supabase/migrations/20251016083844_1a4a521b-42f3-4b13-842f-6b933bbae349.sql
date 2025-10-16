-- Add new fields to cool_cell_reservations for tracking arrival and departure
ALTER TABLE public.cool_cell_reservations
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arrived_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS departed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS departed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for faster queries on arrived_at
CREATE INDEX IF NOT EXISTS idx_cool_cell_reservations_arrived_at ON public.cool_cell_reservations(arrived_at);

-- Add comments for documentation
COMMENT ON COLUMN public.cool_cell_reservations.arrived_at IS 'Timestamp when the deceased body actually arrived at the facility';
COMMENT ON COLUMN public.cool_cell_reservations.departed_at IS 'Timestamp when the deceased body departed from the facility';
COMMENT ON COLUMN public.cool_cell_reservations.rejection_reason IS 'Reason for rejection if status is REJECTED';

-- Function to mark arrival
CREATE OR REPLACE FUNCTION public.mark_cool_cell_arrival(
  p_reservation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cool_cell_id UUID;
BEGIN
  -- Update reservation with arrival time
  UPDATE public.cool_cell_reservations
  SET arrived_at = NOW(),
      arrived_by_user_id = p_user_id,
      status = 'OCCUPIED'
  WHERE id = p_reservation_id
    AND status = 'CONFIRMED'
  RETURNING cool_cell_id INTO v_cool_cell_id;
  
  IF v_cool_cell_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found or not in CONFIRMED status';
  END IF;
  
  -- Update cool cell status to OCCUPIED
  UPDATE public.cool_cells
  SET status = 'OCCUPIED'
  WHERE id = v_cool_cell_id;
  
  -- Log the event
  INSERT INTO public.audit_events (
    event_type,
    target_type,
    target_id,
    user_id,
    description,
    metadata
  ) VALUES (
    'COOL_CELL_ARRIVAL',
    'CoolCellReservation',
    p_reservation_id,
    p_user_id,
    'Deceased body arrived at cool cell',
    jsonb_build_object(
      'cool_cell_id', v_cool_cell_id,
      'arrived_at', NOW()
    )
  );
END;
$$;

-- Function to auto-release cool cell after end time
CREATE OR REPLACE FUNCTION public.auto_release_cool_cell(
  p_reservation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cool_cell_id UUID;
  v_dossier_id UUID;
BEGIN
  -- Update reservation with departure time
  UPDATE public.cool_cell_reservations
  SET departed_at = NOW(),
      status = 'COMPLETED'
  WHERE id = p_reservation_id
    AND status = 'OCCUPIED'
    AND end_at <= NOW()
  RETURNING cool_cell_id, dossier_id INTO v_cool_cell_id, v_dossier_id;
  
  IF v_cool_cell_id IS NULL THEN
    RETURN; -- Nothing to release
  END IF;
  
  -- Check if there are any other active reservations for this cell
  IF NOT EXISTS (
    SELECT 1 FROM public.cool_cell_reservations
    WHERE cool_cell_id = v_cool_cell_id
      AND status IN ('CONFIRMED', 'OCCUPIED')
      AND id != p_reservation_id
  ) THEN
    -- Free the cell if no other reservations
    UPDATE public.cool_cells
    SET status = 'FREE'
    WHERE id = v_cool_cell_id;
  END IF;
  
  -- Log the event
  INSERT INTO public.audit_events (
    event_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    'COOL_CELL_AUTO_RELEASE',
    'CoolCellReservation',
    p_reservation_id,
    'Cool cell automatically released after reservation end time',
    jsonb_build_object(
      'cool_cell_id', v_cool_cell_id,
      'dossier_id', v_dossier_id,
      'released_at', NOW()
    )
  );
END;
$$;

-- Function to manually mark departure
CREATE OR REPLACE FUNCTION public.mark_cool_cell_departure(
  p_reservation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cool_cell_id UUID;
BEGIN
  -- Update reservation with departure time
  UPDATE public.cool_cell_reservations
  SET departed_at = NOW(),
      departed_by_user_id = p_user_id,
      status = 'COMPLETED'
  WHERE id = p_reservation_id
    AND status = 'OCCUPIED'
  RETURNING cool_cell_id INTO v_cool_cell_id;
  
  IF v_cool_cell_id IS NULL THEN
    RAISE EXCEPTION 'Reservation not found or not in OCCUPIED status';
  END IF;
  
  -- Check if there are any other active reservations for this cell
  IF NOT EXISTS (
    SELECT 1 FROM public.cool_cell_reservations
    WHERE cool_cell_id = v_cool_cell_id
      AND status IN ('CONFIRMED', 'OCCUPIED')
      AND id != p_reservation_id
  ) THEN
    -- Free the cell if no other reservations
    UPDATE public.cool_cells
    SET status = 'FREE'
    WHERE id = v_cool_cell_id;
  END IF;
  
  -- Log the event
  INSERT INTO public.audit_events (
    event_type,
    target_type,
    target_id,
    user_id,
    description,
    metadata
  ) VALUES (
    'COOL_CELL_DEPARTURE',
    'CoolCellReservation',
    p_reservation_id,
    p_user_id,
    'Deceased body departed from cool cell',
    jsonb_build_object(
      'cool_cell_id', v_cool_cell_id,
      'departed_at', NOW()
    )
  );
END;
$$;