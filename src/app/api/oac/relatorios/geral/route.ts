import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const PAGE_SIZE = 1000

type UserContractRow = {
  codigo_contrato: string | null
}

type ContractRow = {
  codigo: string
  nome: string | null
}

type LocalRow = {
  id: number
  local: string | null
}

type EquipeRow = {
  equipe: string | null
  id: string | number
}

type ObservadorInfo = {
  matricula?: number | null
  nome?: string | null
}

type CategoriaInfo = {
  categoria?: string | null
  id?: string | number | null
}

type SubcategoriaInfo = {
  categoria?: CategoriaInfo | CategoriaInfo[] | null
  id?: string | number | null
  subcategoria?: string | null
}

type DesvioRow = {
  id: string
  quantidade_desvios: number | null
  subcategoria?: SubcategoriaInfo | SubcategoriaInfo[] | null
}

type OacRow = {
  contrato: string | null
  created_at: string | null
  datahora_inicio: string | null
  desvios: DesvioRow[] | null
  equipe: string | number | null
  id: string
  local: string | number | null
  observador: string | number | null
  observador_info?: ObservadorInfo | ObservadorInfo[] | null
  qtd_pessoas_abordadas: number | null
  tempo_observacao: number | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 401 })
    }

    const allowedContracts = await fetchAllowedContracts(auth.user.matricula)

    if (allowedContracts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          rows: [],
        },
      })
    }

    const [oacs, { data: locais }, { data: equipes }, { data: contratos }] = await Promise.all([
      fetchAllOacs(allowedContracts),
      supabase.from('locais').select('id, local').returns<LocalRow[]>(),
      supabase.from('equipes').select('id, equipe').returns<EquipeRow[]>(),
      supabase.from('contratos').select('codigo, nome').in('codigo', allowedContracts).returns<ContractRow[]>(),
    ])

    const localMap = new Map((locais || []).map((item) => [String(item.id), item.local || String(item.id)]))
    const equipeMap = new Map((equipes || []).map((item) => [String(item.id), item.equipe || String(item.id)]))
    const contratoMap = new Map((contratos || []).map((item) => [item.codigo, item.nome || item.codigo]))

    const rows = oacs.map((oac) => {
      const observadorInfo = firstItem(oac.observador_info)
      const contratoCodigo = oac.contrato || 'Sem contrato'

      return {
        area: resolveMapValue(oac.local, localMap, 'Sem area'),
        celula: resolveMapValue(oac.equipe, equipeMap, 'Sem celula'),
        contrato: contratoMap.get(contratoCodigo) || contratoCodigo,
        contratoCodigo,
        createdAt: oac.created_at,
        dataRegistro: oac.datahora_inicio,
        desvios: (oac.desvios || []).map((desvio) => {
          const subcategoria = firstItem(desvio.subcategoria)
          const categoria = firstItem(subcategoria?.categoria)

          return {
            categoria: categoria?.categoria || 'Sem categoria',
            quantidade: desvio.quantidade_desvios || 0,
            subcategoria: subcategoria?.subcategoria || 'Sem subcategoria',
          }
        }),
        id: oac.id,
        observador: observadorInfo?.nome || String(oac.observador || 'Observador nao informado'),
        pessoasAbordadas: oac.qtd_pessoas_abordadas || 0,
        tempoObservacao: oac.tempo_observacao || 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        rows,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar relatorio geral de OAC:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar relatorio de OAC' },
      { status: 500 },
    )
  }
}

async function fetchAllowedContracts(matricula: number) {
  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('contrato_raiz')
    .eq('matricula', matricula)
    .single()

  if (userError) {
    throw userError
  }

  const { data: links, error: linksError } = await supabase
    .from('usuario_contratos')
    .select('codigo_contrato')
    .eq('matricula_usuario', matricula)
    .returns<UserContractRow[]>()

  if (linksError) {
    throw linksError
  }

  const contracts = new Set<string>()

  if (userData?.contrato_raiz) {
    contracts.add(userData.contrato_raiz)
  }

  ;(links || []).forEach((link) => {
    if (link.codigo_contrato) {
      contracts.add(link.codigo_contrato)
    }
  })

  return Array.from(contracts)
}

async function fetchAllOacs(allowedContracts: string[]) {
  const rows: OacRow[] = []
  let page = 0

  while (true) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('oacs')
      .select(
        `
          id,
          observador,
          equipe,
          local,
          datahora_inicio,
          tempo_observacao,
          qtd_pessoas_abordadas,
          contrato,
          created_at,
          observador_info:observador(matricula, nome),
          desvios:desvios_oac(
            id,
            quantidade_desvios,
            subcategoria:item_desvio(
              id,
              subcategoria,
              categoria:categoria_pai(
                id,
                categoria
              )
            )
          )
        `,
      )
      .in('contrato', allowedContracts)
      .order('datahora_inicio', { ascending: false })
      .range(from, to)
      .returns<OacRow[]>()

    if (error) {
      throw error
    }

    rows.push(...(data || []))

    if (!data || data.length < PAGE_SIZE) {
      break
    }

    page += 1
  }

  return rows
}

function firstItem<T>(value?: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function resolveMapValue(value: string | number | null, map: Map<string, string>, fallback: string) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  return map.get(String(value)) || String(value)
}
