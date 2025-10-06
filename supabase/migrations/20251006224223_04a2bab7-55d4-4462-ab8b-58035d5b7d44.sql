-- Add created_at column to user_roles table for audit trail
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();