/**
 * This is a API server
 */

// load env first
import dotenv from 'dotenv'
dotenv.config()

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'

// ESM mode helpers were unused; removed to satisfy lint

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, _next: NextFunction): void => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
