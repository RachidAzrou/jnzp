-- Create task type enum
CREATE TYPE public.task_type AS ENUM (
  'DOC_REUPLOAD_REQUEST',
  'MOSQUE_CONFIRM',
  'WASH_START',
  'FLIGHT_REGISTER',
  'INTAKE_COMPLETE',
  'LEGAL_HOLD_FOLLOW_UP',
  'TRANSPORT_PREPARE',
  'DOC_REVIEW'
);

-- Create task status enum
CREATE TYPE public.task_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'DONE',
  'CANCELLED'
);

-- Create priority enum
CREATE TYPE public.priority AS ENUM (
  'HIGH',
  'MEDIUM',
  'LOW'
);

-- Create priority source enum
CREATE TYPE public.priority_source AS ENUM (
  'AUTO',
  'MANUAL'
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type task_type NOT NULL,
  status task_status NOT NULL DEFAULT 'OPEN',
  priority priority NOT NULL DEFAULT 'MEDIUM',
  priority_source priority_source NOT NULL DEFAULT 'AUTO',
  priority_set_by_user_id UUID REFERENCES auth.users(id),
  priority_set_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Funeral directors can view tasks"
ON public.tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Funeral directors can insert tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'funeral_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Funeral directors can update tasks"
ON public.tasks
FOR UPDATE
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Funeral directors can delete tasks"
ON public.tasks
FOR DELETE
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-calculate priority based on type and dossier status
CREATE OR REPLACE FUNCTION public.calculate_task_priority(
  _task_type task_type,
  _dossier_id UUID
)
RETURNS priority
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dossier_status dossier_status;
  _legal_hold BOOLEAN;
  _result priority;
BEGIN
  -- Get dossier info
  SELECT status, legal_hold INTO _dossier_status, _legal_hold
  FROM dossiers
  WHERE id = _dossier_id;

  -- HIGH priority conditions
  IF _legal_hold = TRUE OR 
     _task_type = 'DOC_REUPLOAD_REQUEST' OR
     _task_type = 'LEGAL_HOLD_FOLLOW_UP' OR
     _task_type = 'INTAKE_COMPLETE' THEN
    _result := 'HIGH';
  
  -- MEDIUM priority conditions
  ELSIF _task_type IN ('MOSQUE_CONFIRM', 'WASH_START', 'FLIGHT_REGISTER', 'DOC_REVIEW') THEN
    _result := 'MEDIUM';
  
  -- LOW priority (default)
  ELSE
    _result := 'LOW';
  END IF;

  RETURN _result;
END;
$$;

-- Create audit log table for priority changes
CREATE TABLE public.task_priority_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  from_priority priority NOT NULL,
  to_priority priority NOT NULL,
  source_before priority_source NOT NULL,
  source_after priority_source NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.task_priority_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs"
ON public.task_priority_audit
FOR SELECT
USING (
  has_role(auth.uid(), 'funeral_director'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can insert audit logs"
ON public.task_priority_audit
FOR INSERT
WITH CHECK (true);