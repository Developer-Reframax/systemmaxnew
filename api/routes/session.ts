import { Router, Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabase.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET!

interface TokenPayload extends jwt.JwtPayload {
  matricula: string
  email?: string
  role?: string
  nome?: string
}

// Middleware to verify JWT token
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de acesso requerido' })
  }

  try {
    jwt.verify(token, JWT_SECRET) as TokenPayload
    next()
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token inválido' })
  }
}

// Create session
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { matricula_usuario, inicio_sessao, paginas_acessadas, modulos_acessados } = req.body

    if (!matricula_usuario || !inicio_sessao) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios não fornecidos'
      })
    }

    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        matricula_usuario,
        inicio_sessao,
        paginas_acessadas: paginas_acessadas || 1,
        modulos_acessados: modulos_acessados || ['Login']
      })
      .select()
      .single()

    if (error) {
      console.error('Session creation error:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao criar sessão'
      })
    }

    res.json({
      success: true,
      session: data,
      message: 'Sessão criada com sucesso'
    })

  } catch (error) {
    console.error('Session creation error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
})

// Update session (for logout)
router.put('/:sessionId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { fim_sessao, tempo_total_segundos, paginas_acessadas, modulos_acessados } = req.body

    const updateData: Partial<{
      fim_sessao: string
      tempo_total_segundos: number
      paginas_acessadas: number
      modulos_acessados: string[]
    }> = {}
    if (fim_sessao) updateData.fim_sessao = fim_sessao
    if (tempo_total_segundos) updateData.tempo_total_segundos = tempo_total_segundos
    if (paginas_acessadas) updateData.paginas_acessadas = paginas_acessadas
    if (modulos_acessados) updateData.modulos_acessados = modulos_acessados

    const { data, error } = await supabase
      .from('sessoes')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Session update error:', error)
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar sessão'
      })
    }

    res.json({
      success: true,
      session: data,
      message: 'Sessão atualizada com sucesso'
    })

  } catch (error) {
    console.error('Session update error:', error)
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
})

export default router