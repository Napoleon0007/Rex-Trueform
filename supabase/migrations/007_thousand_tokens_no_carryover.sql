-- ================================================================
-- 007_thousand_tokens_no_carryover.sql
-- New token economy:
--   • 1,000 tokens granted every month (was 50)
--   • 1,000-token welcome bonus on first sign-up (was 50)
--   • No carry-over: get_token_balance already counts only the current
--     month's transactions, so unused tokens are wiped at month end —
--     use them or lose them. The old "-20 unspent penalty" is therefore
--     removed (it would double-punish under a no-carry-over model).
-- ================================================================

-- ----------------------------------------------------------------
-- Welcome bonus: 1,000 tokens for every new sign-up
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (NEW.id, 'allocation', 1000, NEW.id, 'profile', 'Welcome bonus — 1,000 tokens');
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- Monthly allocation: a fresh 1,000 tokens, no rollover, no penalty
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.allocate_monthly_tokens(
  p_year  INTEGER DEFAULT EXTRACT(YEAR  FROM NOW())::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW())::INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  public.profiles%ROWTYPE;
  v_alloc public.monthly_allocations%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT * FROM public.profiles LOOP
    BEGIN
      INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
      VALUES (v_user.id, p_year, p_month, 1000) RETURNING * INTO v_alloc;

      INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
      VALUES (v_user.id, 'allocation', 1000, v_alloc.id, 'allocation',
              FORMAT('Monthly allocation — %s/%s', p_month, p_year));

      v_count := v_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;  -- already allocated this month
    END;
  END LOOP;
  RETURN v_count;
END;
$$;
