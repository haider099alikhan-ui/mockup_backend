import { Hono } from 'hono'
import { createSupabaseClient } from '../lib/supabase.js'

const publicDocs = new Hono()

// Serve a document publicly
publicDocs.get('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const supabase = createSupabaseClient(c) // Service role context since it's unauthenticated

        // Fetch the document using the service role to bypass restrictive RLS 
        // We only want to return it if is_public is true.
        const { data: document, error } = await supabase
            .from('hosted_documents')
            .select('title, content, type, is_public')
            .eq('id', id)
            .single()

        if (error || !document || !document.is_public) {
            return c.html(`
                <!DOCTYPE html>
                <html>
                <head><title>Not Found</title></head>
                <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h1>404 - Document Not Found</h1>
                    <p>This document does not exist or has not been made public.</p>
                </body>
                </html>
            `, 404)
        }

        // Handle app-ads.txt (must be raw text)
        if (document.type === 'app_ads') {
            return c.text(document.content || '')
        }

        // Handle HTML documents (Privacy Policy, Terms, DMCA)
        return c.html(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${document.title || 'Document'}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px 20px;
                    }
                    h1, h2, h3 { color: #111; }
                    a { color: #2563eb; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                ${document.content || ''}
            </body>
            </html>
        `)

    } catch (error) {
        console.error('Public doc serve error:', error)
        return c.text('Internal Server Error', 500)
    }
})

export default publicDocs
