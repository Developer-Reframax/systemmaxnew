import { createClient } from '@supabase/supabase-js'
import type { AuthUser } from '@/lib/auth'
import type { FuncionalidadeDTO, ModuloDTO, PermissionsResponse } from '@/lib/types/permissions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ModuloRow = {
  id: string
  nome: string
  descricao?: string | null
  slug: string
  tipo: 'corporativo' | 'exclusivo'
  ativo: boolean
  modulo_contratos: {
    id: string
    codigo_contrato: string | null
  }[] | null
}

type FuncionalidadeRow = {
  id: string
  nome: string
  descricao?: string | null
  slug: string
  tipo: 'corporativo' | 'exclusivo'
  ativa: boolean
  modulo_id: string
  funcionalidade_usuarios: {
    matricula_usuario: number | null
  }[] | null
}

export async function getUserPermissions(
  user: AuthUser,
  contractCodeOverride?: string
): Promise<PermissionsResponse | null> {
  const contractCode = contractCodeOverride || user.contrato_raiz
  if (!contractCode) {
    return null
  }

  const { data: modulesData, error: modulesError } = await supabase
    .from('modulos')
    .select('id, nome, descricao, slug, tipo, ativo, modulo_contratos!left(id, codigo_contrato)')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .returns<ModuloRow[]>()

  if (modulesError) {
    console.error('Erro ao buscar modulos:', modulesError)
    throw new Error('Erro ao buscar modulos')
  }

  const allowedModules = (modulesData || []).filter(
    (modulo) =>
      modulo.tipo === 'corporativo' ||
      (modulo.modulo_contratos || []).some((link) => link.codigo_contrato === contractCode)
  )

  const modulos: ModuloDTO[] = []

  for (const modulo of allowedModules) {
    const { data: funcionalidadesData, error: funcionalidadesError } = await supabase
      .from('modulo_funcionalidades')
      .select(
        'id, nome, descricao, slug, tipo, ativa, modulo_id, funcionalidade_usuarios!left(matricula_usuario)'
      )
      .eq('modulo_id', modulo.id)
      .eq('ativa', true)
      .order('nome', { ascending: true })
      .returns<FuncionalidadeRow[]>()

    if (funcionalidadesError) {
      console.error('Erro ao buscar funcionalidades:', funcionalidadesError)
      throw new Error('Erro ao buscar funcionalidades')
    }

    const funcionalidadesPermitidas: FuncionalidadeDTO[] = (funcionalidadesData || [])
      .filter(
        (funcionalidade) =>
          funcionalidade.tipo === 'corporativo' ||
          (funcionalidade.funcionalidade_usuarios || []).some(
            (link) => link.matricula_usuario === user.matricula
          )
      )
      .map((funcionalidade) => ({
        id: funcionalidade.id,
        nome: funcionalidade.nome,
        slug: funcionalidade.slug,
        descricao: funcionalidade.descricao ?? null
      }))

    modulos.push({
      id: modulo.id,
      nome: modulo.nome,
      slug: modulo.slug,
      descricao: modulo.descricao ?? null,
      funcionalidades: funcionalidadesPermitidas
    })
  }

  return { modulos }
}

