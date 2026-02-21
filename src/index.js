import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth.js'
import projectRoutes from './routes/projects.js'
import userRoutes from './routes/user.js'
import exportRoutes from './routes/exports.js'

const app = new Hono()

// CORS — allow frontend origin
app.use('*', cors({
    origin: (origin, c) => {
        const allowed = c.env.FRONTEND_URL || 'http://localhost:5173'
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

// Protected routes — require auth
app.use('/api/projects/*', authMiddleware)
app.use('/api/user/*', authMiddleware)
app.use('/api/exports/*', authMiddleware)

// Mount route groups
app.route('/api/projects', projectRoutes)
app.route('/api/user', userRoutes)
app.route('/api/exports', exportRoutes)

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
