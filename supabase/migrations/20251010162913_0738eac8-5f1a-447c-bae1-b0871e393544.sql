-- Schakel alleen CUSTOM triggers uit (niet system triggers)
ALTER TABLE public.user_roles DISABLE TRIGGER enforce_valid_role_for_org;
ALTER TABLE public.user_roles DISABLE TRIGGER prevent_last_admin_deletion_trigger;
ALTER TABLE public.user_roles DISABLE TRIGGER prevent_last_admin_role_change_trigger;