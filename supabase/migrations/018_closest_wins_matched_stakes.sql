-- ================================================================
-- 018_closest_wins_matched_stakes.sql
-- New settlement: CLOSEST WINS + MATCHED STAKES.
--
-- Old behaviour (003/005): score/numeric events gave EVERY bet a
-- weighted slice of the pot (closest got the biggest share, but a
-- wild guess still got tokens back). Winner events split the whole
-- pot among correct pickers — a loser lost his entire stake even if
-- he'd staked far more than the winners put up.
--
-- New behaviour (all three event types, one rule):
--   * WINNERS: winner events = the correct pick; score events = the
--     smallest total distance (|home diff| + |away diff|); numeric
--     events = the smallest |diff|. An exact hit is distance 0, so
--     "spot on wins outright" falls out for free — and there is
--     ALWAYS at least one winner.
--   * MATCHED STAKES: each loser pays in at most what the winners
--     collectively staked — LEAST(loser's stake, total winner stake).
--     The unmatched remainder is GIVEN BACK (type 'refund', so it
--     never counts as winnings on the leaderboard).
--   * Winners share the collected pool IN PROPORTION TO STAKE, on
--     top of getting their own stake back.
--   * Ties split the pool by stake. All-tied / solo bettor / nobody
--     right (winner events) = everyone fully refunded.
--
-- Worked example — game ends 10–20:
--   B stakes 200 on 12–20 (off by 2), A stakes 500 on 10–15 (off by 5).
--   B is closest. A's 500 is only matched up to B's 200, so:
--   B gets 400 (stake back + A's matched 200); A takes back 300.
--   Equal stakes still behave like a classic pot: 5 mates x 200,
--   closest takes the full 1,000.
--
-- Kept intact from 005/016: admin check, row locks, re-settlement
-- reversal (it reverses the latest positive payout/refund per bet,
-- which now also correctly reverses givebacks), validation, the
-- voided-event path, event_results bookkeeping.
-- ================================================================

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

  -- ------------------------------------------------------------
  -- Who wins?
  -- ------------------------------------------------------------
  IF v_event.event_type = 'winner' THEN
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

  -- Nobody right (winner events) or no losers (everyone tied closest /
  -- a solo bettor): nobody beat anybody — full refunds, and we book
  -- them as 'refund' so the leaderboard's tokens_won stays honest.
  v_refund_all := (v_winner_total = 0 AND v_total_bet > 0)   -- winner event, nobody right
               OR (v_winner_total = v_total_bet);            -- no losing money to win

  -- ------------------------------------------------------------
  -- Pass 1: mark winners (score = stake) / losers (score = 0) and
  -- collect the matched pool from the losers.
  -- ------------------------------------------------------------
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    IF v_event.event_type = 'winner' THEN
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

-- expose the recreated RPC to PostgREST immediately
NOTIFY pgrst, 'reload schema';
