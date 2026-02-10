import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from './supabase'
import type { Usuario } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'


export interface AuthUser {
  matricula: number
  nome: string
  email: string
  role: 'Admin' | 'Editor' | 'Usuario'
  funcao?: string
  contrato_raiz?: string
  tipo?: string
}

export interface LoginCredentials {
  identifier: string // matricula or email
  password: string
}

export interface AuthResponse {
  success: boolean
  user?: AuthUser
  message?: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      matricula: user.matricula,
      nome: user.nome,
      email: user.email,
      role: user.role,
      funcao: user.funcao,
      contrato_raiz: user.contrato_raiz,
      tipo: user.tipo
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  )
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  if (!token || !JWT_SECRET) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      matricula?: number
      nome?: string
      email?: string
      role?: AuthUser['role']
      funcao?: string
      contrato_raiz?: string
      tipo?: string
    }

    if (
      decoded.matricula === undefined ||
      decoded.nome === undefined ||
      decoded.email === undefined ||
      decoded.role === undefined
    ) {
      return null
    }

    return {
      matricula: decoded.matricula,
      nome: decoded.nome,
      email: decoded.email,
      role: decoded.role,
      funcao: decoded.funcao,
      contrato_raiz: decoded.contrato_raiz,
      tipo: decoded.tipo
    }
  } catch {
    return null
  }
}

// Login function
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const { identifier, password } = credentials
    
    // Check if identifier is email or matricula
    const isEmail = identifier.includes('@')
    const query = supabase
      .from('usuarios')
      .select('*')
      .eq('status', 'ativo')
    
    if (isEmail) {
      query.eq('email', identifier)
    } else {
      const matricula = parseInt(identifier)
      if (isNaN(matricula)) {
        return {
          success: false,
          message: 'Matrícula deve ser um número válido'
        }
      }
      query.eq('matricula', matricula)
    }
    
    const { data: users, error } = await query.single()
    
    if (error || !users) {
      return {
        success: false,
        message: 'Usuário não encontrado ou inativo'
      }
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, users.password_hash)
    
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Senha incorreta'
      }
    }
    
    // Check if user accepted terms
    if (!users.termos) {
      return {
        success: false,
        message: 'Usuário deve aceitar os termos de uso'
      }
    }
    
    const authUser: AuthUser = {
      matricula: users.matricula,
      nome: users.nome,
      email: users.email,
      role: users.role,
      funcao: users.funcao,
      contrato_raiz: users.contrato_raiz,
      tipo: users.tipo
    }
    
    return {
      success: true,
      user: authUser,
      message: 'Login realizado com sucesso'
    }
    
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : String(error))
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

// Register new user
export async function registerUser(userData: Partial<Usuario>): Promise<AuthResponse> {
  try {
    if (!userData.password_hash || !userData.email || !userData.matricula || !userData.nome) {
      return {
        success: false,
        message: 'Dados obrigatórios não fornecidos'
      }
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(userData.password_hash)
    
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        ...userData,
        password_hash: hashedPassword,
        status: 'ativo',
        role: userData.role || 'Usuario',
        termos: userData.termos || false,
        terceiro: userData.terceiro || false
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return {
          success: false,
          message: 'Matrícula ou email já cadastrado'
        }
      }
      return {
        success: false,
        message: 'Erro ao criar usuário: ' + error.message
      }
    }
    
    const authUser: AuthUser = {
      matricula: data.matricula,
      nome: data.nome,
      email: data.email,
      role: data.role,
      funcao: data.funcao,
      contrato_raiz: data.contrato_raiz,
      tipo: data.tipo
    }
    
    return {
      success: true,
      user: authUser,
      message: 'Usuário criado com sucesso'
    }
    
  } catch (error) {
    console.error('Register error:', error instanceof Error ? error.message : String(error))
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}

// Update user password
export async function updatePassword(matricula: number, newPassword: string): Promise<AuthResponse> {
  try {
    const hashedPassword = await hashPassword(newPassword)
    
    const { error } = await supabase
      .from('usuarios')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('matricula', matricula)
    
    if (error) {
      return {
        success: false,
        message: 'Erro ao atualizar senha: ' + error.message
      }
    }
    
    return {
      success: true,
      message: 'Senha atualizada com sucesso'
    }
    
  } catch (error) {
    console.error('Update password error:', error instanceof Error ? error.message : String(error))
    return {
      success: false,
      message: 'Erro interno do servidor'
    }
  }
}



