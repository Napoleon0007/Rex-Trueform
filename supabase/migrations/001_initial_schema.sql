-- ================================================================
-- REX CASINO — SUPABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- CUSTOM TYPES
-- ================================================================

CREATE TYPE public.event_status AS ENUM ('open', 'closed', 'settled');
CREATE TYPE public.transaction_type AS ENUM ('allocation', 'bet', 'payout', 'refund');

-- ================================================================
-- TABLES
-- ================================================================

CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT        NOT NULL UNIQUE,
  display_name  TEXT        NOT NULL,
  avatar_url    TEXT,
  is_admin      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.profiles.is_admin IS 'TRUE for Rex (admin). Self-promotion blocked by RLS.';

CREATE TABLE public.events (
  id            UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_name    TEXT                   NOT NULL,
  description   TEXT,
  unit          TEXT                   NOT NULL,
  closing_time  TIMESTAMPTZ            NOT NULL,
  status        public.event_status    NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  CONSTRAINT events_closing_future CHECK (closing_time > created_at)
);

CREATE TABLE public.bets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id    UUID        NOT NULL REFERENCES public.events(id)   ON DELETE CASCADE,
  prediction  INTEGER     NOT NULL,
  amount      INTEGER     NOT NULL,
  score       NUMERIC(14,6),
  payout      NUMERIC(14,6),
  placed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bets_amount_positive CHECK (amount >= 1),
  UNIQUE (user_id, event_id)
);

CREATE TABLE public.monthly_allocations (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year             INTEGER NOT NULL,
  month            INTEGER NOT NULL,
  tokens_allocated INTEGER NOT NULL DEFAULT 20,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_allocations_month_range CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT monthly_allocations_year_floor  CHECK (year >= 2024),
  UNIQUE (user_id, year, month)
);

CREATE TABLE public.event_results (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID        NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  actual_result    INTEGER     NOT NULL,
  total_tokens_bet INTEGER     NOT NULL DEFAULT 0,
  total_score      NUMERIC(14,6) NOT NULL DEFAULT 0,
  settled_by       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  settled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id             UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID                    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type           public.transaction_type NOT NULL,
  amount         INTEGER                 NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  description    TEXT                    NOT NULL,
  created_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_nonzero CHECK (amount <> 0)
);
COMMENT ON TABLE public.transactions IS 'Append-only token ledger. Never update or delete rows.';

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_events_status        ON public.events(status);
CREATE INDEX idx_events_closing_time  ON public.events(closing_time);
CREATE INDEX idx_events_created_by    ON public.events(created_by);
CREATE INDEX idx_bets_user_id         ON public.bets(user_id);
CREATE INDEX idx_bets_event_id        ON public.bets(event_id);
CREATE INDEX idx_bets_placed_at       ON public.bets(placed_at DESC);
CREATE INDEX idx_monthly_alloc_user   ON public.monthly_allocations(user_id);
CREATE INDEX idx_monthly_alloc_ym     ON public.monthly_allocations(year, month);
CREATE INDEX idx_txn_user_id          ON public.transactions(user_id);
CREATE INDEX idx_txn_type             ON public.transactions(type);
CREATE INDEX idx_txn_reference        ON public.transactions(reference_id, reference_type);
CREATE INDEX idx_txn_created_at       ON public.transactions(created_at DESC);
CREATE INDEX idx_txn_user_id_created  ON public.transactions(user_id, created_at DESC);

-- ================================================================
-- UTILITY FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.get_token_balance(
  p_user_id UUID,
  p_year    INTEGER DEFAULT EXTRACT(YEAR  FROM NOW())::INTEGER,
  p_month   INTEGER DEFAULT EXTRACT(MONTH FROM NOW())::INTEGER
)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM   public.transactions
  WHERE  user_id = p_user_id
    AND  EXTRACT(YEAR  FROM created_at)::INTEGER = p_year
    AND  EXTRACT(MONTH FROM created_at)::INTEGER = p_month;
$$;

-- ================================================================
-- TRIGGERS
-- ================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated_at   BEFORE UPDATE ON public.events   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_bets_updated_at     BEFORE UPDATE ON public.bets     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username',     SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles: authenticated read all"    ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles: own update no self-promote" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles: admin update any"          ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- events
CREATE POLICY "events: authenticated read all" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events: admin insert"           ON public.events FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "events: admin update"           ON public.events FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "events: admin delete"           ON public.events FOR DELETE TO authenticated USING (public.is_admin());

-- bets
CREATE POLICY "bets: own always, others post-close" ON public.bets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status IN ('closed', 'settled')));
CREATE POLICY "bets: block direct insert" ON public.bets FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "bets: block direct update" ON public.bets FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "bets: block direct delete" ON public.bets FOR DELETE TO authenticated USING (FALSE);

-- monthly_allocations
CREATE POLICY "monthly_allocations: own or admin read" ON public.monthly_allocations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "monthly_allocations: block direct insert" ON public.monthly_allocations FOR INSERT TO authenticated WITH CHECK (FALSE);

-- event_results
CREATE POLICY "event_results: authenticated read all" ON public.event_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_results: block direct insert"    ON public.event_results FOR INSERT TO authenticated WITH CHECK (FALSE);

-- transactions
CREATE POLICY "transactions: own or admin read" ON public.transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "transactions: block direct insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (FALSE);

-- ================================================================
-- BUSINESS LOGIC FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION public.place_bet(p_event_id UUID, p_prediction INTEGER, p_amount INTEGER)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID  := auth.uid();
  v_event   public.events%ROWTYPE;
  v_balance INTEGER;
  v_bet_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status <> 'open' THEN RAISE EXCEPTION 'Event is not open for betting'; END IF;
  IF v_event.closing_time <= NOW() THEN RAISE EXCEPTION 'Betting has closed for this event'; END IF;
  IF p_amount < 1 THEN RAISE EXCEPTION 'Minimum bet is 1 token'; END IF;
  v_balance := public.get_token_balance(v_user_id);
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient tokens: have %, need %', v_balance, p_amount; END IF;
  INSERT INTO public.bets (user_id, event_id, prediction, amount) VALUES (v_user_id, p_event_id, p_prediction, p_amount) RETURNING id INTO v_bet_id;
  INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
  VALUES (v_user_id, 'bet', -p_amount, v_bet_id, 'bet', FORMAT('Bet %s tokens on "%s"', p_amount, v_event.event_name));
  RETURN v_bet_id;
END;
$$;

-- Schedule: SELECT cron.schedule('close-events', '*/5 * * * *', 'SELECT public.close_expired_events()');
CREATE OR REPLACE FUNCTION public.close_expired_events()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.events SET status = 'closed', updated_at = NOW() WHERE status = 'open' AND closing_time <= NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_event(p_event_id UUID, p_actual_result INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event       public.events%ROWTYPE;
  v_total_bet   INTEGER  := 0;
  v_total_score NUMERIC  := 0;
  v_bet         public.bets%ROWTYPE;
  v_score       NUMERIC;
  v_payout      NUMERIC;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found: %', p_event_id; END IF;
  IF v_event.status = 'settled' THEN RAISE EXCEPTION 'Event already settled'; END IF;
  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(amount::NUMERIC * (1.0 / (ABS(prediction - p_actual_result) + 1))), 0)
  INTO v_total_bet, v_total_score FROM public.bets WHERE event_id = p_event_id;
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id FOR UPDATE LOOP
    v_score  := v_bet.amount::NUMERIC * (1.0 / (ABS(v_bet.prediction - p_actual_result) + 1));
    v_payout := CASE WHEN v_total_score > 0 THEN (v_score / v_total_score) * v_total_bet ELSE 0 END;
    UPDATE public.bets SET score = v_score, payout = v_payout WHERE id = v_bet.id;
    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (v_bet.user_id, 'payout', ROUND(v_payout)::INTEGER, v_bet.id, 'payout',
            FORMAT('Payout: "%s" — result %s %s', v_event.event_name, p_actual_result, v_event.unit));
  END LOOP;
  INSERT INTO public.event_results (event_id, actual_result, total_tokens_bet, total_score, settled_by)
  VALUES (p_event_id, p_actual_result, v_total_bet, v_total_score, auth.uid());
  UPDATE public.events SET status = 'settled', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- Schedule: SELECT cron.schedule('monthly-tokens', '0 0 1 * *', 'SELECT public.allocate_monthly_tokens()');
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
      VALUES (v_user.id, p_year, p_month, 20) RETURNING * INTO v_alloc;
      INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
      VALUES (v_user.id, 'allocation', 20, v_alloc.id, 'allocation', FORMAT('Monthly allocation — %s/%s', p_month, p_year));
      v_count := v_count + 1;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_event(p_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_bet   public.bets%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin privileges required'; END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF v_event.status = 'settled' THEN RAISE EXCEPTION 'Cannot void a settled event'; END IF;
  FOR v_bet IN SELECT * FROM public.bets WHERE event_id = p_event_id LOOP
    INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
    VALUES (v_bet.user_id, 'refund', v_bet.amount, v_bet.id, 'refund', FORMAT('Refund: "%s" was voided', v_event.event_name));
  END LOOP;
  UPDATE public.events SET status = 'closed', updated_at = NOW() WHERE id = p_event_id;
END;
$$;

-- ================================================================
-- VIEWS
-- ================================================================

CREATE OR REPLACE VIEW public.user_token_balances AS
SELECT p.id AS user_id, p.username, p.display_name, p.avatar_url,
  EXTRACT(YEAR  FROM NOW())::INTEGER AS year,
  EXTRACT(MONTH FROM NOW())::INTEGER AS month,
  public.get_token_balance(p.id) AS balance
FROM public.profiles p;

CREATE OR REPLACE VIEW public.events_with_results AS
SELECT e.*, er.actual_result, er.total_tokens_bet, er.total_score, er.settled_at, er.settled_by
FROM public.events e
LEFT JOIN public.event_results er ON er.event_id = e.id;

CREATE OR REPLACE VIEW public.monthly_leaderboard AS
SELECT
  p.id AS user_id, p.username, p.display_name, p.avatar_url,
  EXTRACT(YEAR  FROM t.created_at)::INTEGER AS year,
  EXTRACT(MONTH FROM t.created_at)::INTEGER AS month,
  COALESCE(SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END), 0) AS tokens_won,
  COALESCE(SUM(CASE WHEN t.type = 'bet' THEN ABS(t.amount) ELSE 0 END), 0) AS tokens_wagered,
  COUNT(DISTINCT CASE WHEN t.type = 'bet' THEN t.reference_id END)::INTEGER AS bets_placed,
  RANK() OVER (
    PARTITION BY EXTRACT(YEAR FROM t.created_at), EXTRACT(MONTH FROM t.created_at)
    ORDER BY SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END) DESC
  ) AS rank
FROM public.profiles p
JOIN public.transactions t ON t.user_id = p.id AND t.type IN ('payout', 'bet')
GROUP BY p.id, p.username, p.display_name, p.avatar_url,
  EXTRACT(YEAR FROM t.created_at), EXTRACT(MONTH FROM t.created_at);

CREATE OR REPLACE VIEW public.yearly_leaderboard AS
SELECT
  p.id AS user_id, p.username, p.display_name, p.avatar_url,
  EXTRACT(YEAR FROM t.created_at)::INTEGER AS year,
  COALESCE(SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END), 0) AS tokens_won,
  COALESCE(SUM(CASE WHEN t.type = 'bet' THEN ABS(t.amount) ELSE 0 END), 0) AS tokens_wagered,
  COUNT(DISTINCT CASE WHEN t.type = 'bet' THEN t.reference_id END)::INTEGER AS bets_placed,
  RANK() OVER (
    PARTITION BY EXTRACT(YEAR FROM t.created_at)
    ORDER BY SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END) DESC
  ) AS rank
FROM public.profiles p
JOIN public.transactions t ON t.user_id = p.id AND t.type IN ('payout', 'bet')
GROUP BY p.id, p.username, p.display_name, p.avatar_url, EXTRACT(YEAR FROM t.created_at);

-- ================================================================
-- POST-DEPLOY CHECKLIST (run manually)
-- ================================================================
-- 1. Enable pg_cron extension in Supabase Dashboard → Database → Extensions
-- 2. Schedule jobs:
--      SELECT cron.schedule('close-events',   '*/5 * * * *', 'SELECT public.close_expired_events()');
--      SELECT cron.schedule('monthly-tokens', '0 0 1 * *',   'SELECT public.allocate_monthly_tokens()');
-- 3. Set the admin:
--      UPDATE public.profiles SET is_admin = TRUE WHERE username = 'rex';
-- 4. Seed first month's tokens (if mid-month at launch):
--      SELECT public.allocate_monthly_tokens(2026, 5);
