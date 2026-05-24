-- ================================================================
-- REX CASINO — Migration 005
-- Admin force actions: edit/void/delete settled events, re-settle
-- Monthly allocation: 50 tokens, rollover, -20 unspent penalty
-- ================================================================

-- ================================================================
-- Updated void_event — now handles settled events
-- Reverses payouts before refunding bets
-- ================================================================
CREATE OR REPLACE FUNCTION public.void_event(p_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event        public.events%ROWTYPE;
  v_bet          public.bets%ROWTYPE;
  v_prior_payout INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  IF v_event.status = 'settled' THEN
    FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id LOOP
      SELECT amount INTO v_prior_payout
      FROM public.transactions
      WHERE reference_id = v_bet.id AND amount > 0 AND type IN ('payout', 'refund')
      ORDER BY created_at DESC LIMIT 1;

      IF FOUND AND v_prior_payout IS NOT NULL AND v_prior_payout > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
        VALUES (v_bet.user_id, 'refund', -v_prior_payout, v_bet.id, 'reversal',
                FORMAT('Cancellation: payout reversed for "%s"', v_event.event_name));
      END IF;
    END LOOP;
    DELETE FROM public.event_results WHERE event_id = p_event_id;
    UPDATE public.bets SET score = NULL, payout = NULL WHERE event_id = p_event_id;
  END IF;

  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id LOOP
    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (v_bet.user_id, 'refund', v_bet.amount, v_bet.id, 'refund',
            FORMAT('Refund: "%s" was voided', v_event.event_name));
  END LOOP;

  UPDATE public.events SET status = 'closed', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- ================================================================
-- Updated settle_event — allows re-settling already settled events
-- Auto-reverses prior payouts before running new settlement
-- ================================================================
CREATE OR REPLACE FUNCTION public.settle_event(
  p_event_id      UUID,
  p_actual_result INTEGER,
  p_actual_away   INTEGER DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event         public.events%ROWTYPE;
  v_total_bet     INTEGER  := 0;
  v_total_score   NUMERIC  := 0;
  v_correct_total NUMERIC  := 0;
  v_bet           public.bets%ROWTYPE;
  v_score         NUMERIC;
  v_payout        NUMERIC;
  v_result_str    TEXT;
  v_nobody_right  BOOLEAN  := FALSE;
  v_prior_payout  INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;

  IF v_event.status = 'settled' THEN
    FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id LOOP
      SELECT amount INTO v_prior_payout
      FROM public.transactions
      WHERE reference_id = v_bet.id AND amount > 0 AND type IN ('payout', 'refund')
      ORDER BY created_at DESC LIMIT 1;

      IF FOUND AND v_prior_payout IS NOT NULL AND v_prior_payout > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
        VALUES (v_bet.user_id, 'refund', -v_prior_payout, v_bet.id, 'reversal',
                FORMAT('Re-settlement: prior payout reversed for "%s"', v_event.event_name));
      END IF;
    END LOOP;
    DELETE FROM public.event_results WHERE event_id = p_event_id;
    UPDATE public.bets SET score = NULL, payout = NULL WHERE event_id = p_event_id;
    UPDATE public.events SET status = 'closed', updated_at = NOW() WHERE id = p_event_id;
    SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  END IF;

  IF v_event.event_type = 'score' AND p_actual_away IS NULL THEN
    RAISE EXCEPTION 'Score events require both home and away results';
  END IF;
  IF v_event.event_type = 'winner' AND p_actual_result NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Winner result must be 1 (home win), 2 (draw), or 3 (away win)';
  END IF;

  v_result_str := CASE v_event.event_type
    WHEN 'score'  THEN FORMAT('%s – %s', p_actual_result, p_actual_away)
    WHEN 'winner' THEN
      CASE p_actual_result
        WHEN 1 THEN COALESCE(v_event.team_home, 'Home') || ' win'
        WHEN 2 THEN 'Draw'
        WHEN 3 THEN COALESCE(v_event.team_away, 'Away') || ' win'
      END
    ELSE FORMAT('%s %s', p_actual_result, v_event.unit)
  END;

  IF v_event.event_type = 'winner' THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_correct_total
    FROM public.bets
    WHERE event_id = p_event_id AND prediction = p_actual_result;
    v_nobody_right := (v_correct_total = 0);
  END IF;

  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    v_total_bet := v_total_bet + v_bet.amount;

    v_score := CASE v_event.event_type
      WHEN 'winner' THEN
        CASE WHEN v_bet.prediction = p_actual_result THEN v_bet.amount::NUMERIC ELSE 0 END
      WHEN 'score' THEN
        v_bet.amount::NUMERIC * (1.0 / (
          ABS(v_bet.prediction - p_actual_result) +
          ABS(COALESCE(v_bet.prediction_away, 0) - p_actual_away) + 1
        ))
      ELSE
        v_bet.amount::NUMERIC * (1.0 / (ABS(v_bet.prediction - p_actual_result) + 1))
    END;

    v_total_score := v_total_score + v_score;
    UPDATE public.bets SET score = v_score WHERE id = v_bet.id;
  END LOOP;

  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_event.event_type = 'winner' AND v_nobody_right THEN
      v_payout := v_bet.amount;
    ELSIF v_total_score > 0 THEN
      v_payout := (v_bet.score / v_total_score) * v_total_bet;
    ELSE
      v_payout := 0;
    END IF;

    UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;

    IF v_payout > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
      VALUES (
        v_bet.user_id,
        CASE WHEN v_event.event_type = 'winner' AND v_nobody_right THEN 'refund' ELSE 'payout' END,
        ROUND(v_payout)::INTEGER,
        v_bet.id, 'payout',
        FORMAT('Payout: "%s" — %s', v_event.event_name, v_result_str)
      );
    END IF;
  END LOOP;

  INSERT INTO public.event_results
    (event_id, actual_result, actual_away, total_tokens_bet, total_score, settled_by)
  VALUES
    (p_event_id, p_actual_result, p_actual_away, v_total_bet, v_total_score, auth.uid());

  UPDATE public.events SET status = 'settled', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- ================================================================
-- Updated delete_event — allows deleting settled events
-- ================================================================
CREATE OR REPLACE FUNCTION public.delete_event(p_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event     public.events%ROWTYPE;
  v_bet_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  IF v_event.status = 'open' THEN
    SELECT COUNT(*) INTO v_bet_count FROM public.bets WHERE event_id = p_event_id;
    IF v_bet_count > 0 THEN
      RAISE EXCEPTION 'Event has % bet(s) — void it first to refund players, then delete', v_bet_count;
    END IF;
  END IF;

  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;

-- ================================================================
-- Updated allocate_monthly_tokens
-- 50 tokens/month, tokens roll over, -20 penalty for unspent tokens
-- ================================================================
CREATE OR REPLACE FUNCTION public.allocate_monthly_tokens(
  p_year  INTEGER DEFAULT EXTRACT(YEAR  FROM NOW())::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM NOW())::INTEGER
)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user    public.profiles%ROWTYPE;
  v_alloc   public.monthly_allocations%ROWTYPE;
  v_balance INTEGER;
  v_count   INTEGER := 0;
BEGIN
  FOR v_user IN SELECT * FROM public.profiles LOOP
    BEGIN
      v_balance := public.get_token_balance(v_user.id);
      IF v_balance > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
        VALUES (v_user.id, 'allocation', -20, v_user.id, 'penalty',
                FORMAT('Penalty: %s unspent token(s) at month end — %s/%s', v_balance, p_month, p_year));
      END IF;

      INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
      VALUES (v_user.id, p_year, p_month, 50) RETURNING * INTO v_alloc;
      INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
      VALUES (v_user.id, 'allocation', 50, v_alloc.id, 'allocation',
              FORMAT('Monthly allocation — %s/%s', p_month, p_year));
      v_count := v_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;
