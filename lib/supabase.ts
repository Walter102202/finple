import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en el entorno.')
  if (!serviceRole) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno (backend-only).')
  cached = createClient(url, serviceRole, { auth: { persistSession: false } })
  return cached
}
