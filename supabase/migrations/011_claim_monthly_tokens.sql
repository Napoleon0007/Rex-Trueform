-- ================================================================
-- 011_claim_monthly_tokens.sql
-- Make the monthly 1,000-token refresh AUTOMATIC and self-serve.
--
-- Until now the monthly grant lived only in allocate_monthly_tokens(),
-- which was meant to be fired by a pg_cron job that was never actually
-- scheduled (it's a comment in 001). So existing members never got a
-- fresh month's tokens on their own. This migration moves the grant to
-- the moment a member OPENS the app: the client calls
-- claim_monthly_tokens() on load and the server hands over that month's
-- 1,000 — but only once per member per calendar month.
--
-- Idempotency key = the monthly_allocations table (UNIQUE per
-- user/year/month). One row there means "this member already got their
-- grant this month", so the claim can be called on every page load and
-- still only ever pays out once a month.
--
-- IMPORTANT — interaction with the June manual top-up:
-- The top-up added an 'allocation' ledger row tagged reference_type
-- 'profile' (a welcome-bonus-style row), NOT a monthly_allocations row.
-- Without the backfill below, claim_monthly_tokens() would see no June
-- monthly_allocations row and grant a SECOND 1,000 on next open (→ 2,000).
-- The backfill marks the current month as already granted for everyone
-- who exists now, so nobody double-dips.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Backfill: mark the CURRENT month as already granted for every
--    existing member (covers the manual top-up just applied).
-- ----------------------------------------------------------------
INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
SELECT id,
       EXTRACT(YEAR  FROM NOW())::INTEGER,
       EXTRACT(MONTH FROM NOW())::INTEGER,
       1000
FROM   public.profiles
ON CONFLICT (user_id, year, month) DO NOTHING;

-- ----------------------------------------------------------------
-- 2. Welcome bonus now also stamps the signup month as granted, so a
--    brand-new member's first-open monthly claim doesn't pay a second
--    1,000 on top of their welcome 1,000 in their first month.
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
-- 3. The self-claim: the signed-in caller takes this month's 1,000 if
--    they haven't already. Returns their balance after the claim.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_monthly_tokens()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  UUID    := auth.uid();
  v_year  INTEGER := EXTRACT(YEAR  FROM NOW())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM NOW())::INTEGER;
  v_alloc public.monthly_allocations%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  BEGIN
    INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
    VALUES (v_user, v_year, v_month, 1000)
    RETURNING * INTO v_alloc;

    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (v_user, 'allocation', 1000, v_alloc.id, 'allocation',
            FORMAT('Monthly allocation — %s/%s', v_month, v_year));
  EXCEPTION WHEN unique_violation THEN
    NULL;  -- already claimed this month; nothing to do
  END;

  RETURN public.get_token_balance(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_monthly_tokens() TO authenticated;
