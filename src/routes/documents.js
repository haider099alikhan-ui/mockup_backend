import { Hono } from 'hono'
import { createSupabaseAdmin, createSupabaseClient } from '../lib/supabase.js'

const documents = new Hono()

// Get all documents for the authenticated user
documents.get('/', async (c) => {
    try {
        const user = c.get('user')
        const supabase = createSupabaseClient(c.env, c.get('token'))

        const { data, error } = await supabase
            .from('hosted_documents')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return c.json({ documents: data })
    } catch (error) {
        console.error('Fetch documents error:', error)
        return c.json({ error: error.message }, 500)
    }
})

// Get a specific document
documents.get('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const supabase = createSupabaseClient(c.env, c.get('token'))

        const { data, error } = await supabase
            .from('hosted_documents')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single()

        if (error) throw error
        if (!data) return c.json({ error: 'Not found' }, 404)

        return c.json({ document: data })
    } catch (error) {
        return c.json({ error: error.message }, 500)
    }
})

// Create a new document
documents.post('/', async (c) => {
    try {
        const user = c.get('user')
        const body = await c.req.json()
        const supabase = createSupabaseClient(c.env, c.get('token'))

        const { type, title, content, is_public = false } = body

        // Guardrail: if creating app_ads, ensure no other app_ads exists for this user
        if (type === 'app_ads') {
            await supabase
                .from('hosted_documents')
                .delete()
                .eq('user_id', user.id)
                .eq('type', 'app_ads')
        }

        const { data, error } = await supabase
            .from('hosted_documents')
            .insert([{
                user_id: user.id,
                type,
                title,
                content,
                is_public
            }])
            .select()
            .single()

        if (error) throw error

        return c.json({ document: data }, 201)
    } catch (error) {
        console.error('Create document error:', error)
        return c.json({ error: error.message }, 500)
    }
})

// Update a document
documents.put('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const body = await c.req.json()
        const supabase = createSupabaseClient(c.env, c.get('token'))

        const { type, title, content, is_public } = body

        const updates = {
            updated_at: new Date().toISOString(),
            ...(type !== undefined && { type }),
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
            ...(is_public !== undefined && { is_public })
        }

        const { data, error } = await supabase
            .from('hosted_documents')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        if (!data) return c.json({ error: 'Not found or forbidden' }, 404)

        return c.json({ document: data })
    } catch (error) {
        console.error('Update document error:', error)
        return c.json({ error: error.message }, 500)
    }
})

// Delete a document
documents.delete('/:id', async (c) => {
    try {
        const user = c.get('user')
        const id = c.req.param('id')
        const supabase = createSupabaseClient(c.env, c.get('token'))

        const { error } = await supabase
            .from('hosted_documents')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (error) throw error

        return c.json({ success: true, message: 'Document deleted' })
    } catch (error) {
        return c.json({ error: error.message }, 500)
    }
})

export default documents
