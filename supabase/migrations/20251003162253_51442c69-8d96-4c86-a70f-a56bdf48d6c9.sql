-- Verwijder de complexe verify functie, we doen validatie client-side
DROP FUNCTION IF EXISTS public.verify_totp_with_replay_guard(UUID, TEXT);

-- Voeg een simpele RLS policy toe zodat gebruikers hun eigen replay guard kunnen inserten
-- tijdens de verificatie flow (maar niet kunnen lezen)
CREATE POLICY "users can claim their own periods"
ON public.user_totp_replay_guard
FOR INSERT
WITH CHECK (auth.uid() = user_id);