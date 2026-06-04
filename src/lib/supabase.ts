import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.local.example to .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep players signed in across reloads AND browser restarts: the session
    // is saved in the browser (localStorage) and the access token is refreshed
    // automatically in the background, so they only ever log in once per device.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
