import { createClient } from '@supabase/supabase-js'

/**
 * Helper to getenv
 */
function getEnvValue(env, key) {
    return (env && env[key]) || (typeof process !== 'undefined' ? process.env[key] : undefined)
}

/**
 * Create a Supabase admin client (service role key — full access).
 * Used on the backend to bypass RLS when needed.
 */
export function createSupabaseAdmin(env) {
    const url = getEnvValue(env, 'SUPABASE_URL')
    const key = getEnvValue(env, 'SUPABASE_SERVICE_KEY')
    return createClient(url, key, {
        auth: { persistSession: false },
    })
}

/**
 * Create a Supabase client scoped to a user's JWT.
 * This respects RLS policies — user can only access their own data.
 */
export function createSupabaseClient(env, token) {
    const url = getEnvValue(env, 'SUPABASE_URL')
    const key = getEnvValue(env, 'SUPABASE_SERVICE_KEY')
    return createClient(url, key, {
        auth: { persistSession: false },
        global: {
            headers: { Authorization: `Bearer ${token}` },
        },
    })
}
