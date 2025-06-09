// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL in env')
}
if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in env')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
