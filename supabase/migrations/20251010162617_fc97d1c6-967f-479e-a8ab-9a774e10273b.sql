-- CRITICAL FIX: Verwijder duplicate audit trigger die context corrupt
-- Er zijn 2 identieke triggers op user_roles die dezelfde functie aanroepen
DROP TRIGGER IF EXISTS audit_user_role_changes ON public.user_roles;

-- Behoud alleen audit_role_changes_trigger (de originele)