import { Hono } from 'hono'
import { createSupabaseAdmin } from '../lib/supabase.js'

const exports = new Hono()

const FREE_EXPORT_LIMIT = 5

// POST /api/exports/check — check if user can export
exports.post('/check', async (c) => {
    const authUser = c.get('user')
    const supabase = createSupabaseAdmin(c.env)

    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, exports_used, exports_reset_at')
        .eq('id', authUser.id)
        .single()

    if (!profile) return c.json({ canExport: true, remaining: FREE_EXPORT_LIMIT })

    // Pro users — unlimited
    if (profile.plan === 'pro') {
        return c.json({ canExport: true, remaining: Infinity, plan: 'pro' })
    }

    // Check if we need to reset the monthly counter
    const resetDate = new Date(profile.exports_reset_at)
    const now = new Date()
    const monthDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + (now.getMonth() - resetDate.getMonth())

    let exportsUsed = profile.exports_used
    if (monthDiff >= 1) {
        // Reset the counter for the new month
        await supabase
            .from('profiles')
            .update({ exports_used: 0, exports_reset_at: now.toISOString() })
            .eq('id', authUser.id)
        exportsUsed = 0
    }

    const remaining = Math.max(0, FREE_EXPORT_LIMIT - exportsUsed)
    return c.json({
        canExport: remaining > 0,
        remaining,
        limit: FREE_EXPORT_LIMIT,
        plan: 'free',
    })
})

// POST /api/exports/track — increment export count
exports.post('/track', async (c) => {
    const authUser = c.get('user')
    const supabase = createSupabaseAdmin(c.env)

    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, exports_used')
        .eq('id', authUser.id)
        .single()

    // Pro users — no tracking needed
    if (profile?.plan === 'pro') {
        return c.json({ success: true })
    }

    const newCount = (profile?.exports_used || 0) + 1

    await supabase
        .from('profiles')
        .update({ exports_used: newCount })
        .eq('id', authUser.id)

    return c.json({
        success: true,
        exports_used: newCount,
        remaining: Math.max(0, FREE_EXPORT_LIMIT - newCount),
    })
})

export default exports
