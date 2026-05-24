-- ================================================================
-- REX CASINO — Migration 003
-- Score events, admin delete, updated settle/place_bet RPCs
-- ================================================================

-- ----------------------------------------------------------------
-- Schema additions
-- ----------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT    NOT NULL DEFAULT 'numeric',
  ADD COLUMN IF NOT EXISTS team_home  TEXT,
  ADD COLUMN IF NOT EXISTS team_away  TEXT;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check CHECK (event_type IN ('numeric', 'score'));

ALTER TABLE public.bets
  ADD COLUMN IF NOT EXISTS prediction_away INTEGER;

ALTER TABLE public.event_results
  ADD COLUMN IF NOT EXISTS actual_away INTEGER;

-- ----------------------------------------------------------------
-- Update events_with_results view to expose new columns
-- ----------------------------------------------------------------

CREATE OR REPLACE VIEW public.events_with_results AS
SELECT
  e.*,
  er.actual_result,
  er.actual_away,
  er.total_tokens_bet,
  er.total_score,
  er.settled_at,
  er.settled_by
FROM public.events e
LEFT JOIN public.event_results er ON er.event_id = e.id;

-- ----------------------------------------------------------------
-- place_bet — adds optional p_prediction_away for score events
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
  IF v_event.event_type = 'score' AND p_prediction_away IS NULL
    THEN RAISE EXCEPTION 'Score events require both home and away predictions'; END IF;

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
-- settle_event — 2D scoring for score events
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.settle_event(
  p_event_id      UUID,
  p_actual_result INTEGER,
  p_actual_away   INTEGER DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event       public.events%ROWTYPE;
  v_total_bet   INTEGER  := 0;
  v_total_score NUMERIC  := 0;
  v_bet         public.bets%ROWTYPE;
  v_score       NUMERIC;
  v_payout      NUMERIC;
  v_distance    NUMERIC;
  v_result_str  TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND        THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status = 'settled' THEN RAISE EXCEPTION 'Event already settled'; END IF;
  IF v_event.event_type = 'score' AND p_actual_away IS NULL
    THEN RAISE EXCEPTION 'Score events require both home and away results'; END IF;

  v_result_str := CASE
    WHEN v_event.event_type = 'score'
      THEN FORMAT('%s – %s', p_actual_result, p_actual_away)
    ELSE FORMAT('%s %s', p_actual_result, v_event.unit)
  END;

  -- Pass 1: compute per-bet scores
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_event.event_type = 'score' THEN
      v_distance := ABS(v_bet.prediction - p_actual_result)
                  + ABS(COALESCE(v_bet.prediction_away, 0) - p_actual_away);
    ELSE
      v_distance := ABS(v_bet.prediction - p_actual_result);
    END IF;

    v_score       := v_bet.amount::NUMERIC * (1.0 / (v_distance + 1));
    v_total_bet   := v_total_bet + v_bet.amount;
    v_total_score := v_total_score + v_score;

    UPDATE public.bets SET score = v_score WHERE id = v_bet.id;
  END LOOP;

  -- Pass 2: distribute payouts proportionally
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    v_payout := CASE
      WHEN v_total_score > 0 THEN (v_bet.score / v_total_score) * v_total_bet
      ELSE 0
    END;

    UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;

    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (
      v_bet.user_id, 'payout', ROUND(v_payout)::INTEGER,
      v_bet.id, 'payout',
      FORMAT('Payout: "%s" — %s', v_event.event_name, v_result_str)
    );
  END LOOP;

  INSERT INTO public.event_results
    (event_id, actual_result, actual_away, total_tokens_bet, total_score, settled_by)
  VALUES
    (p_event_id, p_actual_result, p_actual_away, v_total_bet, v_total_score, auth.uid());

  UPDATE public.events SET status = 'settled', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- ----------------------------------------------------------------
-- delete_event — safe admin delete
--   Open + no bets  → delete
--   Open + has bets → error (void first)
--   Closed (voided) → delete (refunds already processed)
--   Settled         → error (permanent history)
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_event(p_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event     public.events%ROWTYPE;
  v_bet_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  IF v_event.status = 'settled' THEN
    RAISE EXCEPTION 'Settled events cannot be deleted';
  END IF;

  IF v_event.status = 'open' THEN
    SELECT COUNT(*) INTO v_bet_count FROM public.bets WHERE event_id = p_event_id;
    IF v_bet_count > 0 THEN
      RAISE EXCEPTION 'Event has % bet(s) — void it first to refund players, then delete', v_bet_count;
    END IF;
  END IF;

  -- Closed (voided) events or open with no bets: safe to delete
  DELETE FROM public.events WHERE id = p_event_id;
END;
$$;
