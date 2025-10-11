-- Fix 1: Kanban Tasks Status Consistency
-- Drop oude constraint eerst
ALTER TABLE kanban_tasks
DROP CONSTRAINT IF EXISTS kanban_tasks_status_check;

-- Update bestaande waarden naar Nederlandse status codes
UPDATE kanban_tasks 
SET status = 'TE_DOEN' 
WHERE status = 'TODO';

UPDATE kanban_tasks 
SET status = 'BEZIG' 
WHERE status = 'IN_PROGRESS';

UPDATE kanban_tasks 
SET status = 'AFGEROND' 
WHERE status = 'DONE';

-- Verander default van kolom naar 'TE_DOEN'
ALTER TABLE kanban_tasks 
ALTER COLUMN status SET DEFAULT 'TE_DOEN';

-- Voeg nieuwe CHECK constraint toe voor Nederlandse status waarden
ALTER TABLE kanban_tasks
ADD CONSTRAINT kanban_tasks_status_check 
CHECK (status IN ('TE_DOEN', 'BEZIG', 'AFGEROND'));

-- Fix 2: QR RPC Force Refresh
-- Voeg een comment toe om PostgREST cache te refreshen
COMMENT ON FUNCTION generate_qr_token_rpc IS 'Generates a secure QR token for dossier access - refreshed 2025-01-11';