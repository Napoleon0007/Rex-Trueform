-- ================================================================
-- 006_edit_bet.sql
-- Let a player change their existing bet (prediction + stake) while
-- the event is still open. Rewrites the bet's single ledger entry so
-- the monthly token balance stays correct — all atomic in one call.
-- ================================================================

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
  IF v_event.event_type = 'winner' AND p_prediction NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Winner prediction must be 1 (home win), 2 (draw), or 3 (away win)';
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
