// DEV-ONLY preview bypass — added for a working session, kept in its own file.
// Open the app with `?preview` in the URL (e.g. http://localhost:3100/?preview)
// to skip the magic-link email login and load straight into the app as an admin.
//
// To disable: delete this file and remove the PREVIEW_ENABLED branch in App.tsx.
// This only activates when the query param is present, so normal auth is untouched.
import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types/database'

export const PREVIEW_ENABLED =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('preview')

// Minimal fake session user — enough to satisfy the auth gate and route guards.
export const previewUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'preview@rexcasino.local',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
} as unknown as User

// Fake admin profile so the Admin tab + full UI show without hitting the DB.
export const previewProfile = {
  id: '00000000-0000-0000-0000-000000000000',
  display_name: 'Admin (preview)',
  is_admin: true,
} as unknown as Profile
