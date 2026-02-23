import { Hono } from 'hono'
import { createSupabaseAdmin } from '../lib/supabase.js'

const user = new Hono()

// GET /api/user/profile — get current user's profile
user.get('/profile', async (c) => {
    const authUser = c.get('user')
    const supabase = createSupabaseAdmin(c.env)

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

    if (error || !data) {
        // Profile might not exist yet (race condition on signup)
        return c.json({
            profile: {
                id: authUser.id,
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || '',
                plan: 'free',
                exports_used: 0,
            },
        })
    }

    return c.json({ profile: data })
})

// PUT /api/user/profile — update profile
user.put('/profile', async (c) => {
    const authUser = c.get('user')
    const body = await c.req.json()
    const supabase = createSupabaseAdmin(c.env)

    const updates = {}
    if (body.full_name !== undefined) updates.full_name = body.full_name
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authUser.id)
        .select()
        .single()

    if (error) {
        return c.json({ error: error.message }, 500)
    }
    return c.json({ profile: data })
})

export default user
