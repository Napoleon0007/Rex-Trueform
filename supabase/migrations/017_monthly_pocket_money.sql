-- ================================================================
-- 017_monthly_pocket_money.sql
-- Monthly tokens become POCKET MONEY: +1,000 added at the start of
-- every month, balances CARRY OVER — nothing is ever taken away.
--
-- Why the strict reset (012) had to go: events can close and settle in
-- a LATER month than the bets were placed (e.g. a July 11 fixture bet
-- on in June). The reset handed those stakes back for free — balance
-- wiped up to 1,000 on the 1st, then the payout landed on top — so
-- cross-month bets were risk-free. With an additive grant there is no
-- wipe and open bets survive month boundaries untouched.
--
-- Scoring is unaffected: the leaderboards are derived from each
-- month's bet/payout transactions, so the monthly crown still resets
-- itself on the 1st — only the spending money accumulates.
--
-- Idempotency: unchanged — one public.monthly_allocations row per
-- member per month (UNIQUE user/year/month) means "already got this
-- month's 1,000". June 2026 rows were stamped by the 012 reset, so
-- deploying this mid-June grants nothing extra now; the first pocket
-- money lands 1 July.
--
-- DEPLOY NOTE (the 012 lesson): run section A (functions) as ONE
-- paste, then section B (pg_cron) as a SEPARATE paste.
-- ================================================================

-- ================================================================
-- A. FUNCTIONS — paste 1
-- ================================================================

-- ----------------------------------------------------------------
-- A1. Grant ONE member their +1,000 for a given month (once).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_monthly_tokens(p_user UUID, p_year INT, p_month INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alloc_id UUID;
BEGIN
  -- claim this member's slot for the month; if it's taken, they're already paid
  BEGIN
    INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
    VALUES (p_user, p_year, p_month, 1000)
    RETURNING id INTO v_alloc_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;

  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (p_user, 'allocation', 1000, v_alloc_id, 'allocation',
          FORMAT('Monthly 1,000 — %s/%s', p_month, p_year));
END;
$$;

-- ----------------------------------------------------------------
-- A2. Grant EVERY member (the monthly cron calls this). Returns count.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_all_monthly()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r       RECORD;
  n       INTEGER := 0;
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.grant_monthly_tokens(r.id, v_year, v_month);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- only the scheduler/owner may fire the all-members grant, not app users
REVOKE EXECUTE ON FUNCTION public.grant_all_monthly() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------
-- A3. Self-serve safety net: the signed-in member claims their month's
--     1,000 on app open (covers anyone who joins after the cron fired).
--     Same name/signature as before — the client (useMonthlyClaim)
--     needs no change.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_monthly_tokens()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID    := auth.uid();
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.grant_monthly_tokens(v_user, v_year, v_month);
  RETURN public.get_token_balance(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_monthly_tokens() TO authenticated;

-- ----------------------------------------------------------------
-- A4. Welcome bonus stamps the signup month as already granted, so a
--     brand-new member's first-open claim doesn't pay a second 1,000
--     on top of their welcome 1,000. (This stamp was written in 011,
--     which never reached prod — 012 didn't carry it, and under the
--     reset semantics it didn't matter. Under additive pocket money
--     it does.)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (NEW.id, 'allocation', 1000, NEW.id, 'profile', 'Welcome bonus — 1,000 tokens');

  INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
  VALUES (NEW.id, v_year, v_month, 1000)
  ON CONFLICT (user_id, year, month) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- A5. Retire the reset machinery (explicit drops — dead functions
--     left lying around are how the PGRST203 overload bugs happened).
-- ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reset_all_monthly();
DROP FUNCTION IF EXISTS public.grant_monthly_reset(UUID, INTEGER, INTEGER);

-- expose the (re)created RPCs to PostgREST immediately
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- B. AUTOMATIC MONTHLY GRANT via pg_cron — paste 2 (SEPARATE paste)
--    00:00 UTC on the 1st of every month (= 02:00 South Africa time).
-- ================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- DO $do$ BEGIN
--   PERFORM cron.unschedule('monthly-token-reset');   -- old name, never scheduled — belt & braces
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $do$;
--
-- DO $do$ BEGIN
--   PERFORM cron.unschedule('monthly-token-grant');
-- EXCEPTION WHEN OTHERS THEN NULL;
-- END $do$;
--
-- SELECT cron.schedule('monthly-token-grant', '0 0 1 * *', $$ SELECT public.grant_all_monthly(); $$);
