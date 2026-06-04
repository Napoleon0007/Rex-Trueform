-- ================================================================
-- 010_avatars_storage.sql
-- Profile pictures. A public "avatars" bucket: everyone can read
-- (so faces render on the Hall of Fame / Wall of Shame and the
-- leaderboard), but a user may only write inside their own folder
-- ( <user-id>/... ). Updating profiles.avatar_url is already allowed
-- by the existing "profiles: own update" RLS policy from 001.
--
-- NOTE: deployed live via the Supabase SQL editor on 2026-06-04.
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars owner write" ON storage.objects;

CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
