import { Hono } from 'hono'
import { createSupabaseAdmin } from '../lib/supabase.js'

const projects = new Hono()

// GET /api/projects — list all user's projects
projects.get('/', async (c) => {
    const user = c.get('user')
    const supabase = createSupabaseAdmin(c.env)

    const { data, error } = await supabase
        .from('projects')
        .select('id, name, template_id, template_name, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ projects: data })
})

// GET /api/projects/:id — get single project with full slides data
projects.get('/:id', async (c) => {
    const user = c.get('user')
    const projectId = c.req.param('id')
    const supabase = createSupabaseAdmin(c.env)

    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

    if (error || !data) return c.json({ error: 'Project not found' }, 404)
    return c.json({ project: data })
})

// POST /api/projects — create a new project
projects.post('/', async (c) => {
    const user = c.get('user')
    const body = await c.req.json()
    const supabase = createSupabaseAdmin(c.env)

    // Check project limit for free users
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()

    if (profile?.plan === 'free') {
        const { count } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (count >= 3) {
            return c.json({
                error: 'Free plan limited to 3 projects. Upgrade to Pro for unlimited.',
                code: 'PROJECT_LIMIT',
            }, 403)
        }
    }

    const { data, error } = await supabase
        .from('projects')
        .insert({
            user_id: user.id,
            name: body.name || 'Untitled Project',
            template_id: body.template_id,
            template_name: body.template_name,
            slides: body.slides || [],
        })
        .select()
        .single()

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ project: data }, 201)
})

// PUT /api/projects/:id — update project (auto-save)
projects.put('/:id', async (c) => {
    const user = c.get('user')
    const projectId = c.req.param('id')
    const body = await c.req.json()
    const supabase = createSupabaseAdmin(c.env)

    const updates = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.slides !== undefined) updates.slides = body.slides
    if (body.template_id !== undefined) updates.template_id = body.template_id
    if (body.template_name !== undefined) updates.template_name = body.template_name
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single()

    if (error) return c.json({ error: error.message }, 500)
    if (!data) return c.json({ error: 'Project not found' }, 404)
    return c.json({ project: data })
})

// DELETE /api/projects/:id — delete project
projects.delete('/:id', async (c) => {
    const user = c.get('user')
    const projectId = c.req.param('id')
    const supabase = createSupabaseAdmin(c.env)

    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ success: true })
})

export default projects
