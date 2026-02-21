import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth.js'
import projectRoutes from './routes/projects.js'
import userRoutes from './routes/user.js'
import exportRoutes from './routes/exports.js'
import documentRoutes from './routes/documents.js'
import publicDocsRoutes from './routes/publicDocs.js'

const app = new Hono()

// CORS — allow frontend origin
app.use('*', cors({
    origin: (origin, c) => {
        const envVal = (c.env && c.env.FRONTEND_URL) || (typeof process !== 'undefined' ? process.env.FRONTEND_URL : undefined)
        const allowed = envVal || 'http://localhost:5173'
        // Allow the configured frontend URL and localhost for dev
        if (origin === allowed || origin === 'http://localhost:5173') {
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

// Public Document Host Route
app.route('/p', publicDocsRoutes)

// Protected routes — require auth
app.use('/api/projects/*', authMiddleware)
app.use('/api/user/*', authMiddleware)
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
