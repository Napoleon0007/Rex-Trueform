-- ================================================================
-- 008_bar.sql
-- The VIP lounge bar. Ordering a drink spends tokens from the player's
-- current-month balance via a real ledger entry. Prices are fixed on
-- the server so the client can't tamper with them.
--   Beer 🍺        = 2 tokens
--   Tequila shot 🥃 = 3 tokens
-- ================================================================

-- New ledger category for bar purchases (kept distinct from bets/payouts).
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'purchase';

CREATE OR REPLACE FUNCTION public.order_drink(p_drink TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_cost    INTEGER;
  v_label   TEXT;
  v_balance INTEGER;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  CASE p_drink
    WHEN 'beer'    THEN v_cost := 2; v_label := 'Beer 🍺';
    WHEN 'tequila' THEN v_cost := 3; v_label := 'Tequila shot 🥃';
    ELSE RAISE EXCEPTION 'Unknown drink: %', p_drink;
  END CASE;

  v_balance := public.get_token_balance(v_user);
  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Not enough tokens: have %, need % for a %', v_balance, v_cost, p_drink;
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (v_user, 'purchase', -v_cost, v_user, 'bar', FORMAT('%s at the bar', v_label));

  RETURN public.get_token_balance(v_user);
END;
$$;
