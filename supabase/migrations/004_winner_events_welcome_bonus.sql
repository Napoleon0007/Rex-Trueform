-- ================================================================
-- REX CASINO — Migration 004
-- Winner event type (soccer-style: pick Home/Draw/Away)
-- Welcome bonus: 50 tokens for every new sign-up
-- ================================================================

-- ----------------------------------------------------------------
-- Add 'winner' to event_type constraint
-- ----------------------------------------------------------------

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('numeric', 'score', 'winner'));

-- ----------------------------------------------------------------
-- Update place_bet — validate winner predictions
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.place_bet(
  p_event_id        UUID,
  p_prediction      INTEGER,
  p_amount          INTEGER,
  p_prediction_away INTEGER DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID    := auth.uid();
  v_event   public.events%ROWTYPE;
  v_balance INTEGER;
  v_bet_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status <> 'open'          THEN RAISE EXCEPTION 'Event is not open for betting'; END IF;
  IF v_event.closing_time <= NOW()     THEN RAISE EXCEPTION 'Betting has closed for this event'; END IF;
  IF p_amount < 1                      THEN RAISE EXCEPTION 'Minimum bet is 1 token'; END IF;

  IF v_event.event_type = 'score' AND p_prediction_away IS NULL THEN
    RAISE EXCEPTION 'Score events require both home and away predictions';
  END IF;
  IF v_event.event_type = 'winner' AND p_prediction NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Winner prediction must be 1 (home win), 2 (draw), or 3 (away win)';
  END IF;

  v_balance := public.get_token_balance(v_user_id);
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens: have %, need %', v_balance, p_amount;
  END IF;

  INSERT INTO public.bets (user_id, event_id, prediction, prediction_away, amount)
  VALUES (v_user_id, p_event_id, p_prediction, p_prediction_away, p_amount)
  RETURNING id INTO v_bet_id;

  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (
    v_user_id, 'bet', -p_amount, v_bet_id, 'bet',
    FORMAT('Bet %s tokens on "%s"', p_amount, v_event.event_name)
  );

  RETURN v_bet_id;
END;
$$;

-- ----------------------------------------------------------------
-- Update settle_event — handles all three event types
--   numeric: proximity scoring (existing)
--   score:   2D proximity scoring (existing)
--   winner:  correct pickers share pot proportionally;
--            if nobody is correct, everyone is refunded
-- ----------------------------------------------------------------

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
  v_distance      NUMERIC;
  v_result_str    TEXT;
  v_nobody_right  BOOLEAN  := FALSE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND          THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status = 'settled' THEN RAISE EXCEPTION 'Event already settled'; END IF;
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

  -- For winner events: pre-compute total tokens on the correct side
  IF v_event.event_type = 'winner' THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_correct_total
    FROM public.bets
    WHERE event_id = p_event_id AND prediction = p_actual_result;
    v_nobody_right := (v_correct_total = 0);
  END IF;

  -- Pass 1: compute per-bet score and accumulate totals
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

  -- Pass 2: distribute payouts
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_event.event_type = 'winner' AND v_nobody_right THEN
      -- Refund everyone when nobody picked correctly
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

-- ----------------------------------------------------------------
-- Welcome bonus: 50 tokens for every new sign-up
-- Trigger fires on INSERT to profiles (created by auth trigger)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (NEW.id, 'allocation', 50, NEW.id, 'profile', 'Welcome bonus — 50 tokens');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();
