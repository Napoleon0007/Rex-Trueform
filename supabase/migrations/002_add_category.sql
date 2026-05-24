-- Add category column to events for sport/topic filtering
ALTER TABLE public.events
  ADD COLUMN category TEXT NOT NULL DEFAULT 'General';

COMMENT ON COLUMN public.events.category IS 'Sport or topic category (e.g. Rugby, Soccer, Cricket, General)';
