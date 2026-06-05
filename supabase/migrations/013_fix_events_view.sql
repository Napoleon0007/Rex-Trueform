-- ================================================================
-- 013_fix_events_view.sql
-- BUG: events_with_results was created (001) with SELECT e.* BEFORE the
-- score-event columns (event_type, team_home, team_away) were added to
-- public.events (003). A view's e.* is frozen at creation, and 003's
-- CREATE OR REPLACE could not re-add columns in the middle of the column
-- list — so the deployed view never exposed event_type. The app reads this
-- view, so EVERY event arrived at the bet form with no type and fell back to
-- the single-number "numeric" input. Score markets could never show their
-- two-team score boxes.
--
-- FIX: drop and recreate the view so e.* expands to ALL current columns.
-- ================================================================

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

-- expose the rebuilt view (with its new columns) to the API immediately
NOTIFY pgrst, 'reload schema';
