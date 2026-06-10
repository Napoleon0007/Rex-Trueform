-- ================================================================
-- 019_pick_events.sql
-- Retire the 'winner' event type (hardcoded Home/Draw/Away) and
-- replace it with a generalized 'pick' type: the admin defines any
-- number of named options (two boxers, a golf field, "Draw" if it
-- applies) and players pick one. Settlement is unchanged math —
-- exact-match pickers split the losers' MATCHED stakes (018) —
-- only the option labels are now admin-defined instead of fixed.
--
-- Data model: events.options TEXT[]; bets.prediction is a 1-BASED
-- index into that array. Legacy winner predictions (1=home, 2=draw,
-- 3=away) therefore convert for free by setting
-- options = [team_home, 'Draw', team_away] — bets rows untouched.
--
-- Section order matters: the live CHECK constraint still rejects
-- 'pick', so it must be dropped BEFORE the backfill and re-added
-- after. The events_with_results view freezes e.* at creation (the
-- 013 lesson), so it is rebuilt after the column exists. All three
-- RPCs are replaced via CREATE OR REPLACE with byte-identical
-- signatures — no drops, no new overloads (the 014/015 PGRST203
-- lesson).
-- ================================================================

-- ----------------------------------------------------------------
-- 1. New column
-- ----------------------------------------------------------------

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS options TEXT[];

-- ----------------------------------------------------------------
-- 2. Drop the old type constraint (it rejects 'pick')
-- ----------------------------------------------------------------

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;

-- ----------------------------------------------------------------
-- 3. Convert legacy winner events to pick events.
--    Predictions 1/2/3 map 1:1 onto options[1..3]; unit is
--    normalized so no 'winner' string leaks into displays.
-- ----------------------------------------------------------------

UPDATE public.events
SET options    = ARRAY[
      COALESCE(NULLIF(TRIM(team_home), ''), 'Home'),
      'Draw',
      COALESCE(NULLIF(TRIM(team_away), ''), 'Away')],
    event_type = 'pick',
    unit       = 'pick'
WHERE event_type = 'winner';

-- ----------------------------------------------------------------
-- 4. Re-add constraints. Events are inserted directly by admins
--    under RLS (there is no create_event RPC), so the >=2 non-empty
--    options rule for pick events lives here at the DB level.
-- ----------------------------------------------------------------

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('numeric', 'score', 'pick'));

ALTER TABLE public.events
  ADD CONSTRAINT events_pick_options_check
  CHECK (
    event_type <> 'pick'
    OR (options IS NOT NULL
        AND array_length(options, 1) >= 2
        AND array_position(options, NULL) IS NULL
        AND array_position(options, '')   IS NULL)
  );

-- ----------------------------------------------------------------
-- 5. Rebuild events_with_results so e.* picks up the new column
--    (views freeze their column list at creation — see 013).
--    The anon grant must stay: ?preview mode lists events without
--    a session.
-- ----------------------------------------------------------------

DROP VIEW IF EXISTS public.events_with_results;

CREATE VIEW public.events_with_results AS
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

GRANT SELECT ON public.events_with_results TO anon, authenticated;

-- ----------------------------------------------------------------
-- 6. place_bet — body from 004, the winner check replaced with a
--    range check against the option list. Signature identical.
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
  IF v_event.event_type = 'pick'
     AND (p_prediction < 1 OR p_prediction > array_length(v_event.options, 1)) THEN
    RAISE EXCEPTION 'Pick must be between 1 and % (the number of options)',
      array_length(v_event.options, 1);
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
-- 7. update_bet — body from 006 with the same validation swap.
--    Signature identical.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_bet(
  p_event_id        UUID,
  p_prediction      INTEGER,
  p_amount          INTEGER,
  p_prediction_away INTEGER DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_event     public.events%ROWTYPE;
  v_bet       public.bets%ROWTYPE;
  v_balance   INTEGER;
  v_available INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND                     THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status <> 'open'      THEN RAISE EXCEPTION 'Event is not open for betting'; END IF;
  IF v_event.closing_time <= NOW() THEN RAISE EXCEPTION 'Betting has closed for this event'; END IF;
  IF p_amount < 1                  THEN RAISE EXCEPTION 'Minimum bet is 1 token'; END IF;

  IF v_event.event_type = 'score' AND p_prediction_away IS NULL THEN
    RAISE EXCEPTION 'Score events require both home and away predictions';
  END IF;
  IF v_event.event_type = 'pick'
     AND (p_prediction < 1 OR p_prediction > array_length(v_event.options, 1)) THEN
    RAISE EXCEPTION 'Pick must be between 1 and % (the number of options)',
      array_length(v_event.options, 1);
  END IF;

  SELECT * INTO v_bet FROM public.bets
    WHERE event_id = p_event_id AND user_id = v_user_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existing bet to update — place a bet first'; END IF;

  -- Current balance already has the old stake deducted; adding it back gives
  -- the amount actually spendable on the new stake.
  v_balance   := public.get_token_balance(v_user_id);
  v_available := v_balance + v_bet.amount;
  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient tokens: have %, need %', v_available, p_amount;
  END IF;

  -- trg_bets_updated_at sets updated_at automatically.
  UPDATE public.bets
     SET prediction      = p_prediction,
         prediction_away = p_prediction_away,
         amount          = p_amount
   WHERE id = v_bet.id;

  -- Rewrite the original 'bet' ledger entry so there is still exactly one
  -- transaction per bet (keeps the balance math and history clean).
  UPDATE public.transactions
     SET amount      = -p_amount,
         description = FORMAT('Bet %s tokens on "%s"', p_amount, v_event.event_name)
   WHERE reference_id = v_bet.id AND type = 'bet';

  RETURN v_bet.id;
END;
$$;

-- ----------------------------------------------------------------
-- 8. settle_event — body verbatim from 018 with the winner branches
--    renamed to pick: validation is a range check, the result string
--    is the chosen option's label, and the winner test is the same
--    exact-match comparison. Closest-wins distance logic for
--    score/numeric, the matched-stakes pool, the refund-all rule and
--    re-settlement reversal are all untouched. Signature identical.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.settle_event(
  p_event_id      UUID,
  p_actual_result INTEGER,
  p_actual_away   INTEGER DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event         public.events%ROWTYPE;
  v_bet           public.bets%ROWTYPE;
  v_total_bet     INTEGER := 0;
  v_winner_total  NUMERIC := 0;   -- sum of winning stakes
  v_pool          NUMERIC := 0;   -- matched money collected from losers
  v_min_dist      NUMERIC;
  v_dist          NUMERIC;
  v_matched       NUMERIC;
  v_payout        NUMERIC;
  v_result_str    TEXT;
  v_refund_all    BOOLEAN := FALSE;
  v_is_winner     BOOLEAN;
  v_prior_payout  INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;

  -- Re-settlement: reverse each bet's latest positive payout/refund
  -- first, then settle fresh (unchanged from 005).
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
  IF v_event.event_type = 'pick'
     AND (p_actual_result < 1 OR p_actual_result > array_length(v_event.options, 1)) THEN
    RAISE EXCEPTION 'Result must be between 1 and % (the number of options)',
      array_length(v_event.options, 1);
  END IF;

  v_result_str := CASE v_event.event_type
    WHEN 'score' THEN FORMAT('%s – %s', p_actual_result, p_actual_away)
    WHEN 'pick'  THEN v_event.options[p_actual_result]
    ELSE FORMAT('%s %s', p_actual_result, v_event.unit)
  END;

  -- ------------------------------------------------------------
  -- Who wins?
  -- ------------------------------------------------------------
  IF v_event.event_type = 'pick' THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_winner_total
    FROM public.bets
    WHERE event_id = p_event_id AND prediction = p_actual_result;
  ELSE
    SELECT MIN(ABS(prediction - p_actual_result)
             + CASE WHEN v_event.event_type = 'score'
                    THEN ABS(COALESCE(prediction_away, 0) - p_actual_away)
                    ELSE 0 END)
    INTO v_min_dist
    FROM public.bets WHERE event_id = p_event_id;

    IF v_min_dist IS NOT NULL THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_winner_total
      FROM public.bets
      WHERE event_id = p_event_id
        AND ABS(prediction - p_actual_result)
          + CASE WHEN v_event.event_type = 'score'
                 THEN ABS(COALESCE(prediction_away, 0) - p_actual_away)
                 ELSE 0 END = v_min_dist;
    END IF;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_bet
  FROM public.bets WHERE event_id = p_event_id;

  -- Nobody right (pick events) or no losers (everyone tied closest /
  -- a solo bettor): nobody beat anybody — full refunds, and we book
  -- them as 'refund' so the leaderboard's tokens_won stays honest.
  v_refund_all := (v_winner_total = 0 AND v_total_bet > 0)   -- pick event, nobody right
               OR (v_winner_total = v_total_bet);            -- no losing money to win

  -- ------------------------------------------------------------
  -- Pass 1: mark winners (score = stake) / losers (score = 0) and
  -- collect the matched pool from the losers.
  -- ------------------------------------------------------------
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_event.event_type = 'pick' THEN
      v_is_winner := (v_bet.prediction = p_actual_result);
    ELSE
      v_dist := ABS(v_bet.prediction - p_actual_result)
              + CASE WHEN v_event.event_type = 'score'
                     THEN ABS(COALESCE(v_bet.prediction_away, 0) - p_actual_away)
                     ELSE 0 END;
      v_is_winner := (v_dist = v_min_dist);
    END IF;

    IF v_is_winner THEN
      UPDATE public.bets SET score = v_bet.amount WHERE id = v_bet.id;
    ELSE
      UPDATE public.bets SET score = 0 WHERE id = v_bet.id;
      IF NOT v_refund_all THEN
        v_pool := v_pool + LEAST(v_bet.amount, v_winner_total);
      END IF;
    END IF;
  END LOOP;

  -- ------------------------------------------------------------
  -- Pass 2: pay out.
  --   refund-all  -> everyone gets their stake back ('refund')
  --   winner      -> stake back + pool share by stake ('payout')
  --   loser       -> the unmatched part of the stake back ('refund')
  -- ------------------------------------------------------------
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_refund_all THEN
      v_payout := v_bet.amount;
    ELSIF v_bet.score > 0 THEN
      v_payout := v_bet.amount + v_pool * v_bet.amount / v_winner_total;
    ELSE
      v_payout := v_bet.amount - LEAST(v_bet.amount, v_winner_total);  -- giveback
    END IF;

    UPDATE public.bets SET payout = v_payout WHERE id = v_bet.id;

    IF v_payout > 0 THEN
      INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
      VALUES (
        v_bet.user_id,
        CASE
          WHEN v_refund_all       THEN 'refund'
          WHEN v_bet.score > 0    THEN 'payout'
          ELSE 'refund'
        END,
        ROUND(v_payout)::INTEGER,
        v_bet.id, 'payout',
        CASE
          WHEN v_refund_all    THEN FORMAT('Refund: "%s" — %s', v_event.event_name, v_result_str)
          WHEN v_bet.score > 0 THEN FORMAT('Payout: "%s" — %s', v_event.event_name, v_result_str)
          ELSE FORMAT('Giveback (unmatched stake): "%s" — %s', v_event.event_name, v_result_str)
        END
      );
    END IF;
  END LOOP;

  INSERT INTO public.event_results
    (event_id, actual_result, actual_away, total_tokens_bet, total_score, settled_by)
  VALUES
    (p_event_id, p_actual_result, p_actual_away, v_total_bet, v_winner_total, auth.uid());

  UPDATE public.events SET status = 'settled', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- expose the new column, rebuilt view and replaced RPCs immediately
NOTIFY pgrst, 'reload schema';
