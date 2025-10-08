-- Forceer herinstallatie van de correcte seeding functie met board_id
DROP FUNCTION IF EXISTS public.fn_seed_dossier_tasks_sql(uuid, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.fn_seed_dossier_tasks_sql(
  p_dossier_id uuid,
  p_flow text,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_board uuid;
  v_todo uuid;
  v_lock bigint;
BEGIN
  SELECT assigned_fd_org_id INTO v_org FROM public.dossiers WHERE id=p_dossier_id;
  IF v_org IS NULL THEN
    RAISE NOTICE 'Dossier % heeft geen assigned_fd_org_id', p_dossier_id;
    RETURN;
  END IF;

  -- advisory lock per dossier
  v_lock := ('x'||substr(replace(p_dossier_id::text,'-',''),1,16))::bit(64)::bigint;
  PERFORM pg_try_advisory_xact_lock(v_lock);

  -- board + todo kolom
  SELECT * INTO v_board, v_todo FROM public.fn_ensure_board_and_todo_col(v_org);

  -- idempotent: stop als er al taken zijn
  IF EXISTS (SELECT 1 FROM public.kanban_tasks WHERE dossier_id=p_dossier_id) THEN
    RETURN;
  END IF;

  IF p_flow='LOC' THEN
    INSERT INTO public.kanban_tasks (dossier_id, board_id, column_id, title, priority)
    VALUES
      (p_dossier_id, v_board, v_todo, 'Intake starten', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Overlijdensakte controleren', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'ID-document vastleggen', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'Verzekering verifiëren', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'Mortuarium plannen (koeling + wassing)', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Moskee & janazah plannen', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Begrafenis & concessie bevestigen', 'MEDIUM');
  ELSE
    INSERT INTO public.kanban_tasks (dossier_id, board_id, column_id, title, priority)
    VALUES
      (p_dossier_id, v_board, v_todo, 'Intake starten (repatriëring)', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Overlijdensakte controleren', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'Paspoort overledene controleren', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'Verzekering verifiëren / offerte', 'HIGH'),
      (p_dossier_id, v_board, v_todo, 'Mortuarium plannen', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Consulaire documenten regelen', 'MEDIUM'),
      (p_dossier_id, v_board, v_todo, 'Vluchtvoorstel / AWB voorbereiden', 'MEDIUM');
  END IF;
END;
$$;

-- Herinstalleer triggers
DROP TRIGGER IF EXISTS trg_dossiers_after_insert_seed ON public.dossiers;
CREATE OR REPLACE FUNCTION public.trg_after_insert_seed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.flow IN ('LOC','REP') THEN
    PERFORM public.fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::TEXT, NEW.status::TEXT);
    INSERT INTO public.dossier_events(dossier_id,event_type,event_description,metadata)
      VALUES (NEW.id,'FLOW_SELECTED','Flow ingesteld bij aanmaak', jsonb_build_object('flow',NEW.flow));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dossiers_after_insert_seed
AFTER INSERT ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.trg_after_insert_seed();

DROP TRIGGER IF EXISTS trg_dossiers_after_update_flow ON public.dossiers;
CREATE OR REPLACE FUNCTION public.trg_after_update_flow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF (OLD.flow IS DISTINCT FROM NEW.flow) AND NEW.flow IN ('LOC','REP') THEN
    IF COALESCE(OLD.status,'CREATED')='CREATED' THEN
      UPDATE public.dossiers SET status='INTAKE_IN_PROGRESS' WHERE id=NEW.id;
    END IF;
    PERFORM public.fn_seed_dossier_tasks_sql(NEW.id, NEW.flow::TEXT, NEW.status::TEXT);
    INSERT INTO public.dossier_events(dossier_id,event_type,event_description,metadata)
      VALUES (NEW.id,'FLOW_SELECTED','Flow gewijzigd', jsonb_build_object('from',COALESCE(OLD.flow,'UNSET'),'to',NEW.flow));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_dossiers_after_update_flow
AFTER UPDATE OF flow ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.trg_after_update_flow();

NOTIFY pgrst, 'reload schema';