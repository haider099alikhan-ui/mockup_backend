import { Hono } from 'hono'
import { createSupabaseAdmin } from '../lib/supabase.js'

const publicDocs = new Hono()

// Serve a document publicly via /u/:uid/:slug
publicDocs.get('/:uid/:slug', async (c) => {
    try {
        const uid = c.req.param('uid')
        const slug = c.req.param('slug')
        const supabase = createSupabaseAdmin(c.env) // Service role context since it's unauthenticated

        const slugMap = {
            'privacy-policy': 'privacy_policy',
            'terms': 'terms',
            'dmca': 'dmca',
            'ads.txt': 'app_ads'
        }

        const docType = slugMap[slug]

        // Helper to return 404 HTML
        const render404 = () => c.html(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Not Found</title>
                <script>
                    const warn = console.warn;
                    console.warn = (...args) => { if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return; warn(...args); };
                </script>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-50 flex items-center justify-center min-h-screen">
                <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">404 - Not Found</h1>
                    <p class="text-gray-500">This document does not exist or has not been made public.</p>
                </div>
            </body>
            </html>
        `, 404)

        if (!docType) return render404()

        // Get the public document directly using the UI UUID
        const { data: document, error } = await supabase
            .from('hosted_documents')
            .select('title, content, type, is_public')
            .eq('user_id', uid)
            .eq('type', docType)
            .single()

        // Handle app-ads.txt specifically (raw text)
        if (docType === 'app_ads') {
            if (error || !document || !document.is_public) return c.text('', 404)
            return c.text(document.content || '')
        }

        // Handle HTML documents
        if (error || !document || !document.is_public) {
            return render404()
        }

        return c.html(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${document.title || 'Legal Document'}</title>
                <script>
                    const warn = console.warn;
                    console.warn = (...args) => { if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return; warn(...args); };
                </script>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    .prose h1, .prose h2, .prose h3, .prose h4 { color: #111827; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
                    .prose p { margin-bottom: 1em; }
                    .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                    .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                    .prose a { color: #2563eb; text-decoration: none; }
                    .prose a:hover { text-decoration: underline; }
                    .prose strong { color: #111827; font-weight: 600; }
                </style>
            </head>
            <body class="bg-gray-50 min-h-screen selection:bg-blue-100 selection:text-blue-900">
                <main class="max-w-3xl mx-auto px-5 py-12 md:py-20 flex flex-col min-h-screen">
                    <article class="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-8 md:p-12 flex-grow">
                        <header class="mb-10 pb-8 border-b border-gray-100">
                            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight">${document.title}</h1>
                        </header>
                        <div class="prose prose-gray max-w-none text-gray-600 leading-relaxed text-[15px] md:text-base">
                            ${document.content || ''}
                        </div>
                    </article>
                    <footer class="mt-12 text-center">
                        <p class="text-[13px] text-gray-400 font-medium">Hosted securely by <span class="text-gray-900">ScreenSnap</span></p>
                    </footer>
                </main>
            </body>
            </html>
        `)

    } catch (error) {
        console.error('Public doc serve error:', error)
        return c.text('Internal Server Error', 500)
    }
})

// Serve the Linktree-style Developer Homepage via /u/:uid
publicDocs.get('/:uid', async (c) => {
    try {
        const uid = c.req.param('uid')
        const supabase = createSupabaseAdmin(c.env)

        // Helper to return 404 HTML
        const render404 = () => c.html(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Not Found</title>
                <script>
                    const warn = console.warn;
                    console.warn = (...args) => { if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return; warn(...args); };
                </script>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-50 flex items-center justify-center min-h-screen">
                <div class="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
                    <h1 class="text-2xl font-bold text-gray-900 mb-2">404 - Not Found</h1>
                    <p class="text-gray-500">This developer profile does not exist.</p>
                </div>
            </body>
            </html>
        `, 404)

        // 1. Get user profile (don't fail if RLS blocks it)
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', uid)
            .single()

        // 2. Get all public HTML documents (exclude app_ads)
        const { data: documents, error: docsErr } = await supabase
            .from('hosted_documents')
            .select('title, type, updated_at')
            .eq('user_id', uid)
            .eq('is_public', true)
            .neq('type', 'app_ads')
            .order('updated_at', { ascending: false })

        if (docsErr) {
            return c.text('Internal Server Error', 500)
        }

        const devName = profile?.full_name || 'Developer'
        const avatarInitial = devName.charAt(0).toUpperCase()
        const avatarHtml = profile?.avatar_url
            ? `<img src="${profile.avatar_url}" alt="${devName}" class="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover mx-auto" />`
            : `<div class="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto text-3xl font-bold text-white">${avatarInitial}</div>`

        const docMap = { privacy_policy: 'privacy-policy', terms: 'terms', dmca: 'dmca', other: 'legal' }

        const docsHtml = documents && documents.length > 0
            ? documents.map(doc => `
                <a href="/u/${profile.id}/${docMap[doc.type] || 'doc'}" class="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all group relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="relative flex items-center justify-between">
                        <div>
                            <h3 class="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">${doc.title}</h3>
                            <p class="text-sm text-gray-500 mt-1">Last updated ${new Date(doc.updated_at).toLocaleDateString()}</p>
                        </div>
                        <div class="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                            <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </div>
                    </div>
                </a>
            `).join('')
            : `<div class="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200"><p class="text-gray-500">No public policies available yet.</p></div>`

        return c.html(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${devName} - Legal Policies</title>
                <script>
                    const warn = console.warn;
                    console.warn = (...args) => { if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return; warn(...args); };
                </script>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-50 min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-gray-50 to-gray-100 font-sans selection:bg-blue-100 selection:text-blue-900">
                <main class="max-w-xl mx-auto px-5 py-16 md:py-24">
                    <header class="text-center mb-12">
                        ${avatarHtml}
                        <h1 class="text-2xl font-bold text-gray-900 mt-5">${devName}</h1>
                        <p class="text-gray-500 mt-2 font-medium">App Publisher Policies</p>
                    </header>
                    
                    <div class="space-y-4">
                        ${docsHtml}
                    </div>

                    <footer class="mt-16 pt-8 border-t border-gray-200/60 text-center">
                        <p class="text-[13px] text-gray-400 font-medium">Hosted securely by <a href="#" class="text-gray-600 hover:text-gray-900 transition-colors">ScreenSnap</a></p>
                    </footer>
                </main>
            </body>
            </html>
        `)

    } catch (error) {
        console.error('Public profile serve error:', error)
        return c.text('Internal Server Error', 500)
    }
})

export default publicDocs
