-- ================================================================
-- FRESH START — June 2026 reset (Luke's call, 2026-06-10)
-- Wipes ALL betting/casino history so the Hall of Fame and Wall of
-- Shame start clean, and lands every member on exactly 1,000 B.
-- Keeps: profiles + avatars, the 3 open events (mates re-place
-- their bets), and monthly_allocations (so the on-open monthly
-- claim cannot double-grant this month).
-- All-or-nothing: any error rolls the whole paste back.
-- ================================================================

-- 1. Wipe settled results, all bets (incl. open ones) and the ledger
DELETE FROM public.event_results;
DELETE FROM public.bets;
DELETE FROM public.transactions;

-- 2. Stamp June 2026 for every member missing it, so
--    claim_monthly_tokens() on app open can't add ANOTHER 1,000.
INSERT INTO public.monthly_allocations (user_id, year, month, tokens_allocated)
SELECT id, 2026, 6, 1000 FROM public.profiles
ON CONFLICT (user_id, year, month) DO NOTHING;

-- 3. Fresh grant: exactly 1,000 for everyone.
INSERT INTO public.transactions (user_id, type, amount, reference_id, reference_type, description)
SELECT id, 'allocation', 1000, id, 'profile', 'Fresh start — June 2026 reset'
FROM public.profiles;

-- 4. Proof: every member and their new balance (should all be 1000).
SELECT p.display_name, public.get_token_balance(p.id) AS balance
FROM public.profiles p
ORDER BY 1;
