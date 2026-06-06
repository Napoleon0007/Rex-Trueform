-- ================================================================
-- 014_fix_place_bet_overload.sql
-- BUG: two place_bet overloads coexisted in the deployed database — the
-- original 3-arg version (001) and the score-aware 4-arg version (003/004,
-- with p_prediction_away INTEGER DEFAULT NULL). PostgREST could not resolve
-- a 3-argument call (winner / numeric bets) between the two candidates and
-- returned PGRST203 "could not choose the best candidate function", so every
-- winner/numeric bet failed with "Failed to place bet".
--
-- FIX: drop the obsolete 3-arg version. The 4-arg version (its 4th arg
-- defaults to NULL) serves every event type — score, winner and numeric.
-- ================================================================

DROP FUNCTION IF EXISTS public.place_bet(uuid, integer, integer);

NOTIFY pgrst, 'reload schema';
