-- ================================================================
-- 009_casino.sql
-- ONE token system: the casino games (roulette, blackjack, poker, slots)
-- wager against the house using the SAME current-month gold-token balance
-- as predictions and the bar. Two append-only ledger ops:
--   casino_bet    — debit a stake (server sanity-caps each stake at 1..500;
--                   the 100-token "table max" is a UI game rule, while poker's
--                   call and a blackjack double can legitimately push a single
--                   ledger debit above 100, hence the higher server bound)
--   casino_payout — credit a win
-- A player's net over a session is simply the sum of these in the ledger.
--
-- Trust model: the payout amount is computed client-side (a private,
-- no-real-money friends' game), so this is intentionally NOT tamper-proof.
-- The stake cap and balance check ARE enforced server-side so nobody can
-- bet tokens they don't have. A fully server-authoritative dealer would be
-- a much larger build and isn't warranted here.
-- ================================================================

-- Reuse the existing 'bet' / 'payout' transaction_type values; tag rows with
-- reference_type = 'casino' so casino activity is distinguishable in the ledger.

CREATE OR REPLACE FUNCTION public.casino_bet(p_stake INTEGER, p_game TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_balance INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_stake IS NULL OR p_stake < 1 OR p_stake > 500 THEN
    RAISE EXCEPTION 'Stake out of range (got %)', p_stake;
  END IF;

  v_balance := public.get_token_balance(v_user);
  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Not enough tokens: have %, need %', v_balance, p_stake;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (v_user, 'bet', -p_stake, v_user, 'casino',
          FORMAT('Staked %s on %s', p_stake, COALESCE(p_game, 'casino')));

  RETURN public.get_token_balance(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.casino_payout(p_amount INTEGER, p_game TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Nothing to credit on a loss / push of 0 — just report the current balance.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN public.get_token_balance(v_user);
  END IF;
  -- Sanity ceiling only: blocks absurd values while clearing any legitimate
  -- win (e.g. a 100-stake straight-up roulette number pays 36× = 3,600).
  IF p_amount > 20000 THEN
    RAISE EXCEPTION 'Payout out of range: %', p_amount;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (v_user, 'payout', p_amount, v_user, 'casino',
          FORMAT('Won %s at %s', p_amount, COALESCE(p_game, 'casino')));

  RETURN public.get_token_balance(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.casino_bet(INTEGER, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.casino_payout(INTEGER, TEXT) TO authenticated;
