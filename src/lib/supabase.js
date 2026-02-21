import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase admin client (service role key — full access).
 * Used on the backend to bypass RLS when needed.
 */
export function createSupabaseAdmin(env) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
    })
}

/**
 * Create a Supabase client scoped to a user's JWT.
 * This respects RLS policies — user can only access their own data.
 */
export function createSupabaseClient(env, token) {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
        global: {
            headers: { Authorization: `Bearer ${token}` },
        },
    })
}
