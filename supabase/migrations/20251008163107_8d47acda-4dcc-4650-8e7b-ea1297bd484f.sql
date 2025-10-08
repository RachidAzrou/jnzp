-- Add place_of_death column to dossiers table
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS place_of_death text;

-- Optional index for searching/filtering
CREATE INDEX IF NOT EXISTS ix_dossiers_place_of_death
  ON public.dossiers (lower(place_of_death));

-- Backfill from dossier_events.metadata.address_of_death (last INTAKE_DETAILS_ADDED per dossier)
WITH last_addr AS (
  SELECT de.dossier_id,
         (de.metadata->>'address_of_death') AS addr,
         ROW_NUMBER() OVER (PARTITION BY de.dossier_id ORDER BY de.created_at DESC) AS rn
  FROM public.dossier_events de
  WHERE de.event_type = 'INTAKE_DETAILS_ADDED'
    AND de.metadata ? 'address_of_death'
)
UPDATE public.dossiers d
SET place_of_death = NULLIF(la.addr, '')
FROM last_addr la
WHERE la.dossier_id = d.id
  AND la.rn = 1
  AND (d.place_of_death IS NULL OR d.place_of_death = '');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';