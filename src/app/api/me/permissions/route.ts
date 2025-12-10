import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyToken } from '@/lib/auth'
import type { FuncionalidadeDTO, ModuloDTO, PermissionsResponse } from '@/lib/types/permissions'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token nao fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Token invalido' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const contractFromParams =
      searchParams.get('contractCode') ||
      searchParams.get('contract_code') ||
      searchParams.get('codigo_contrato') ||
      undefined

    const contractCode = contractFromParams || decoded.contrato_raiz
    if (!contractCode) {
      return NextResponse.json(
        { error: 'Contrato nao informado e nao encontrado no token' },
        { status: 400 }
      )
    }

    const { data: modulesData, error: modulesError } = await supabase
      .from('modulos')
      .select(
        'id, nome, descricao, slug, tipo, ativo, modulo_contratos!left(id, codigo_contrato)'
      )
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .returns<ModuloRow[]>()

    if (modulesError) {
      console.error('Erro ao buscar modulos:', modulesError)
      return NextResponse.json({ error: 'Erro ao buscar modulos' }, { status: 500 })
    }

    const allowedModules = (modulesData || []).filter(
      (modulo) =>
        modulo.tipo === 'corporativo' ||
        (modulo.modulo_contratos || []).some(
          (link) => link.codigo_contrato === contractCode
        )
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
        return NextResponse.json(
          { error: 'Erro ao buscar funcionalidades' },
          { status: 500 }
        )
      }

      const funcionalidadesPermitidas: FuncionalidadeDTO[] = (funcionalidadesData || [])
        .filter(
          (funcionalidade) =>
            funcionalidade.tipo === 'corporativo' ||
            (funcionalidade.funcionalidade_usuarios || []).some(
              (link) => link.matricula_usuario === decoded.matricula
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

    const payload: PermissionsResponse = { modulos }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro na rota de permissoes:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
