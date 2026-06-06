-- ================================================================
-- 015_fix_settle_event_overload.sql
-- BUG: identical to 014's place_bet problem. settle_event was first defined
-- 2-arg in 001 (p_event_id, p_actual_result), then redefined 3-arg in
-- 003/004/005 (… p_actual_away INTEGER DEFAULT NULL). CREATE OR REPLACE
-- cannot replace across a changed signature, so the 2-arg version is still
-- live alongside the 3-arg one. When an admin settles a winner/numeric event
-- the frontend sends only 2 args (no away score) and PostgREST cannot choose
-- between the two candidates (PGRST203) — so most events could not be settled.
--
-- FIX: drop the obsolete 2-arg version. The 3-arg version (4th-of-3 arg
-- defaults to NULL) settles every event type.
-- ================================================================

DROP FUNCTION IF EXISTS public.settle_event(uuid, integer);

NOTIFY pgrst, 'reload schema';
