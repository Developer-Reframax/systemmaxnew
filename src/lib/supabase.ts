import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Usuario {
  matricula: number
  nome: string
  funcao?: string
  contrato_raiz?: string
  data_admissao?: string
  data_demissao?: string
  phone?: string
  telefone?: string
  email: string
  data_nascimento?: string
  endereco?: string
  bio?: string
  avatar_url?: string
  status: 'ativo' | 'inativo'
  password_hash: string
  termos: boolean
  terceiro: boolean
  role: 'Admin' | 'Editor' | 'Usuario'
  last_login?: string
  created_at: string
  updated_at: string
  letra_id?: string // ID da letra associada
  equipe_id?: string // ID da equipe associada
  contratos?: Contrato[] // Contratos que o usuário tem acesso
  letra?: Letra // Relacionamento com letra
  equipe?: Equipe // Relacionamento com equipe
}

export interface Contrato {
  codigo: string; // Primary key
  nome: string;
  local?: string;
  responsavel?: number; // Matrícula do usuário responsável
  status: 'ativo' | 'inativo';
  codigo_wpp?: string;
  localizacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Sessao {
  id: string
  matricula_usuario: number
  inicio_sessao: string
  fim_sessao?: string | null
  paginas_acessadas?: number | null
  modulos_acessados?: unknown[] | null
  tempo_total_segundos?: number | null
  created_at?: string
}

export interface Modulo {
  id: string
  nome: string
  descricao: string
  tipo: 'corporativo' | 'exclusivo'
  ativo: boolean
  created_at: string
}

export interface Letra {
  id: string
  letra: string
  codigo_contrato: string
  lider: number // Matrícula do líder
  created_at: string
  // Relacionamentos opcionais
  usuarios?: {
    nome: string
  }
}

export interface Equipe {
  id: number
  nome: string
  descricao: string
  contrato_id: number
  supervisor_id?: number
  lider_id?: number
  ativo: boolean
  equipe?: string
  codigo_contrato?: string
  created_at: string
  updated_at?: string
}

export interface Funcionalidade {
  id: string
  modulo_id: string
  nome: string
  descricao?: string
  ativa: boolean
  created_at: string
  modulo?: Modulo
}

export interface UsuarioContrato {
  id?: number
  matricula_usuario: number
  codigo_contrato: string
  codigo: string // Alias para codigo_contrato para compatibilidade
  created_at?: string
  updated_at?: string
  // Relacionamentos opcionais
  usuario?: Usuario
  contrato?: Contrato
}

export interface FuncionalidadeUsuario {
  id: string
  funcionalidade_id: string
  matricula_usuario: number
  created_at: string
  funcionalidade?: Funcionalidade
}
