import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        matricula: string
        email: string
        nome: string
        role: string
      }
    }
  }
}