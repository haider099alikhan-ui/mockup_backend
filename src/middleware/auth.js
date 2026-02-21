import { createSupabaseAdmin } from '../lib/supabase.js'

/**
 * Auth middleware — verifies the JWT from the Authorization header.
 * Attaches `c.user` with the authenticated user's data.
 */
export async function authMiddleware(c, next) {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Missing or invalid authorization header' }, 401)
    }

    const token = authHeader.replace('Bearer ', '')

    try {
        const supabase = createSupabaseAdmin(c.env)
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
            return c.json({ error: 'Invalid or expired token' }, 401)
        }

        // Attach user and token to context
        c.set('user', user)
        c.set('token', token)

        await next()
    } catch (err) {
        return c.json({ error: 'Authentication failed' }, 401)
    }
}
