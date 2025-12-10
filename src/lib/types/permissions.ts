export interface FuncionalidadeDTO {
  id: string
  nome: string
  slug: string
  descricao?: string | null
}

export interface ModuloDTO {
  id: string
  nome: string
  slug: string
  descricao?: string | null
  funcionalidades: FuncionalidadeDTO[]
}

export interface PermissionsResponse {
  modulos: ModuloDTO[]
}
