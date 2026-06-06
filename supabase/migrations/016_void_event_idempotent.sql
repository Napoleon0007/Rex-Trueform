-- ================================================================
-- 016_void_event_idempotent.sql
-- BUG: void_event refunded every bet's stake UNCONDITIONALLY on each call and
-- only set the event back to status 'closed' (not a terminal voided state).
-- Voiding the same event twice therefore refunded every stake a second time,
-- silently inflating player balances.
--
-- FIX: skip any bet that already carries a stake-refund transaction, making
-- void idempotent. (The settled-payout reversal block already self-guards,
-- because the first void flips status away from 'settled'.)
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
    -- Idempotency: never refund a stake that a prior void already refunded.
    IF EXISTS (
      SELECT 1 FROM public.transactions
      WHERE reference_id = v_bet.id AND type = 'refund' AND reference_type = 'refund'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (v_bet.user_id, 'refund', v_bet.amount, v_bet.id, 'refund',
            FORMAT('Refund: "%s" was voided', v_event.event_name));
  END LOOP;

  UPDATE public.events SET status = 'closed', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
