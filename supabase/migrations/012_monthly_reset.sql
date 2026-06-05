-- ================================================================
-- 012_monthly_reset.sql
-- STRICT monthly tokens: every member is reset to EXACTLY 1,000 at
-- the start of each calendar month — no carryover, everyone equal.
--
-- Why a "reset" (not the old additive +1,000 in 011): the house rule
-- is 1,000/month with no carryover. So the monthly job writes a single
-- adjusting ledger entry that lands each member's balance on exactly
-- 1,000 — topping up a loser, wiping a winner's surplus. It's recorded
-- in public.transactions (append-only), so nothing is forgotten, and it
-- only ever touches 'allocation' rows — bet/payout stats are untouched.
--
-- Idempotency: public.monthly_allocations has UNIQUE(user_id, year,
-- month). One row there = "this member already got their reset this
-- month", so the job/self-claim can run any number of times and only
-- ever resets once per member per month.
--
-- NOTE (011 was never deployed): claim_monthly_tokens() did not exist in
-- prod (PGRST202). This migration creates it with RESET semantics and
-- adds the automatic month-start cron that 001 only ever described.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Reset ONE member to exactly 1,000 for a given month (once).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_monthly_reset(p_user UUID, p_year INT, p_month INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alloc_id UUID;
  v_bal      INTEGER;
BEGIN
  -- claim this member's slot for the month; if it's taken, they're already done
  BEGIN
    INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
    VALUES (p_user, p_year, p_month, 1000)
    RETURNING id INTO v_alloc_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;

  v_bal := public.get_token_balance(p_user);
  IF v_bal <> 1000 THEN  -- transactions.amount must be <> 0; skip if already exactly 1,000
    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (p_user, 'allocation', 1000 - v_bal, v_alloc_id, 'allocation',
            FORMAT('Monthly reset to 1,000 — %s/%s', p_month, p_year));
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- 2. Reset EVERY member (the monthly cron calls this). Returns count.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_all_monthly()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r       RECORD;
  n       INTEGER := 0;
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.grant_monthly_reset(r.id, v_year, v_month);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ----------------------------------------------------------------
-- 3. Self-serve safety net: the signed-in member resets themselves on
--    app open (covers anyone the cron didn't reach). The client already
--    calls claim_monthly_tokens() on load (useMonthlyClaim).
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_monthly_tokens()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID    := auth.uid();
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.grant_monthly_reset(v_user, v_year, v_month);
  RETURN public.get_token_balance(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_monthly_tokens() TO authenticated;

-- expose the (re)created RPC to PostgREST immediately
NOTIFY pgrst, 'reload schema';

-- ----------------------------------------------------------------
-- 4. Automatic month-start reset via pg_cron — 00:00 UTC on the 1st
--    of every month (= 02:00 South Africa time).
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('monthly-token-reset');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('monthly-token-reset', '0 0 1 * *', $$ SELECT public.reset_all_monthly(); $$);

-- ----------------------------------------------------------------
-- 5. ONE-TIME operational step (run once in the SQL editor to put
--    everyone on the strict 1,000 baseline right now):
--      SELECT public.reset_all_monthly();
-- ----------------------------------------------------------------
