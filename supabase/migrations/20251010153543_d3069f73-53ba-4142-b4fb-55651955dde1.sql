-- Fix missing ENUM values voor org_type en app_role

-- Voeg MORTUARIUM toe aan org_type ENUM
ALTER TYPE public.org_type ADD VALUE IF NOT EXISTS 'MORTUARIUM';

-- Voeg missende rollen toe aan app_role ENUM
-- BELANGRIJK: ADD VALUE werkt alleen als de waarde nog niet bestaat
DO $$
BEGIN
  -- Voeg mortuarium toe
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'mortuarium') THEN
    ALTER TYPE public.app_role ADD VALUE 'mortuarium';
  END IF;
  
  -- Voeg platform_admin toe  
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'platform_admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'platform_admin';
  END IF;
  
  -- Voeg mosque toe
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'mosque') THEN
    ALTER TYPE public.app_role ADD VALUE 'mosque';
  END IF;
  
  -- Voeg org_admin toe
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'org_admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'org_admin';
  END IF;
END$$;