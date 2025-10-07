-- Simpele migratie: voeg alleen is_admin kolom toe
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;