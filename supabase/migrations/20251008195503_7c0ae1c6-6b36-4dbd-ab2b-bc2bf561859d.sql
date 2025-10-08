-- Helper-triggerfunctie die de seeder aanroept
CREATE OR REPLACE FUNCTION public.fn_call_seed_on_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_seed_dossier_tasks_sql(NEW.id::uuid, NEW.flow::text, NEW.status::text);
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_call_seed_on_row() TO authenticated;

-- AFTER INSERT → nieuw dossier
DROP TRIGGER IF EXISTS trg_dossiers_after_insert_seed ON public.dossiers;
CREATE TRIGGER trg_dossiers_after_insert_seed
AFTER INSERT ON public.dossiers
FOR EACH ROW
WHEN (NEW.flow IN ('LOC','REP'))
EXECUTE FUNCTION public.fn_call_seed_on_row();

-- AFTER UPDATE OF flow → UNSET→LOC/REP
DROP TRIGGER IF EXISTS trg_dossiers_after_update_flow ON public.dossiers;
CREATE TRIGGER trg_dossiers_after_update_flow
AFTER UPDATE OF flow ON public.dossiers
FOR EACH ROW
WHEN (OLD.flow IS DISTINCT FROM NEW.flow AND NEW.flow IN ('LOC','REP'))
EXECUTE FUNCTION public.fn_call_seed_on_row();

-- AFTER UPDATE OF status → seed wanneer naar PLANNING gaat (als er nog niets is)
DROP TRIGGER IF EXISTS trg_dossiers_after_update_status ON public.dossiers;
CREATE TRIGGER trg_dossiers_after_update_status
AFTER UPDATE OF status ON public.dossiers
FOR EACH ROW
WHEN (NEW.status = 'PLANNING')
EXECUTE FUNCTION public.fn_call_seed_on_row();

-- PostgREST schema refresh
NOTIFY pgrst, 'reload schema';