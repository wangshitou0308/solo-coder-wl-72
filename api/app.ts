/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dashboardRoutes from './routes/dashboard.js'
import inverterRoutes from './routes/inverters.js'
import panelRoutes from './routes/panels.js'
import generationRoutes from './routes/generation.js'
import revenueRoutes from './routes/revenue.js'
import maintenanceRoutes from './routes/maintenance.js'
import reportRoutes from './routes/report.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/inverters', inverterRoutes)
app.use('/api/panels', panelRoutes)
app.use('/api/generation', generationRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/report', reportRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (_req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
