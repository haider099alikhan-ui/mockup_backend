import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth.js'
import projectRoutes from './routes/projects.js'
import userRoutes from './routes/user.js'
import exportRoutes from './routes/exports.js'
import documentRoutes from './routes/documents.js'
import publicDocsRoutes from './routes/publicDocs.js'
import { createSupabaseAdmin } from './lib/supabase.js'

const app = new Hono()

// CORS — allow frontend origin
app.use('*', cors({
    origin: (origin, c) => {
        const envVal = (c.env && c.env.FRONTEND_URL) || (typeof process !== 'undefined' ? process.env.FRONTEND_URL : undefined)

        // Always allow any localhost port for local development
        if (origin && origin.startsWith('http://localhost:')) {
            return origin
        }

        if (origin === envVal || origin === 'https://mockup-frontend-two.vercel.app') {
            return origin
        }

        return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}))

// Health check — no auth required
app.get('/api/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Public Document Host Route (Vanity URLs)
app.route('/u', publicDocsRoutes)

// Root ads.txt Route (Global Aggregation)
app.get('/ads.txt', async (c) => {
    try {
        const supabase = createSupabaseAdmin(c.env)
        const { data, error } = await supabase
            .from('hosted_documents')
            .select('content')
            .eq('type', 'app_ads')
            .eq('is_public', true)

        if (error || !data) return c.text('', 200)

        // Merge all contents separated by newline
        const merged = data.map(d => d.content).filter(Boolean).join('\n\n')
        return c.text(merged, 200, {
            'Content-Type': 'text/plain; charset=utf-8'
        })
    } catch (err) {
        return c.text('', 200)
    }
})

// Protected routes — require auth
app.use('/api/projects/*', authMiddleware)
app.use('/api/user/profile', authMiddleware)
app.use('/api/exports/*', authMiddleware)
app.use('/api/documents/*', authMiddleware)

// Mount route groups
app.route('/api/projects', projectRoutes)
app.route('/api/user', userRoutes)
app.route('/api/exports', exportRoutes)
app.route('/api/documents', documentRoutes)

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
    console.error('Server error:', err)
    return c.json({ error: 'Internal server error' }, 500)
})

export default app
