import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { verifyJWTToken } from '@/lib/jwt-middleware'
import { userHasFunctionality } from '@/lib/permissions-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BOASPRATICAS_GESTAO_GERAL_SLUG = 'boaspraticas-gestao-geral'
const PAGE_SIZE = 1000

type EnvolvidoRow = {
  matricula_envolvido: number | null
}

type PraticaRow = {
  area_aplicada: string | number | null
  categoria: number | null
  comentario_validacao: string | null
  contrato: string | null
  created_at: string | null
  data_implantacao: string | null
  descricao: string | null
  descricao_problema: string | null
  elimina_desperdicio: number | null
  eliminada: boolean | null
  envolvidos: EnvolvidoRow[] | null
  fabricou_dispositivo: boolean
  geral: boolean
  id: string
  likes: number
  matricula_cadastrante: number
  objetivo: string | null
  pilar: number | null
  projeto: string | null
  relevancia: number | null
  responsavel_etapa: number | null
  resultados: string | null
  status: string
  tags: number[] | null
  titulo: string
  updated_at: string | null
  validacao: boolean | null
  visualizacoes: number
}

type CatalogRow = {
  id: number
  nome: string | null
}

type ContractRow = {
  codigo: string
  nome: string | null
}

type UserRow = {
  matricula: number
  nome: string | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const allowed = await userHasFunctionality(auth.user!, BOASPRATICAS_GESTAO_GERAL_SLUG)
    if (!allowed) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const [
      praticas,
      { data: categorias },
      { data: pilares },
      { data: areasAplicadas },
      { data: eliminaDesperdicio },
      { data: tagsCatalogo },
      { data: contratos },
    ] = await Promise.all([
      fetchAllPractices(),
      supabase.from('boaspraticas_categoria').select('id, nome').returns<CatalogRow[]>(),
      supabase.from('boaspraticas_pilar').select('id, nome').returns<CatalogRow[]>(),
      supabase.from('boaspraticas_area_aplicada').select('id, nome').returns<CatalogRow[]>(),
      supabase.from('boaspraticas_elimina_desperdicio').select('id, nome').returns<CatalogRow[]>(),
      supabase.from('boaspraticas_tags_catalogo').select('id, nome').returns<CatalogRow[]>(),
      supabase.from('contratos').select('codigo, nome').returns<ContractRow[]>(),
    ])

    const matriculas = collectMatriculas(praticas)
    const usuarios = await fetchUsuarios(matriculas)

    const categoriaMap = mapById(categorias || [])
    const pilarMap = mapById(pilares || [])
    const areaMap = mapById(areasAplicadas || [])
    const eliminaMap = mapById(eliminaDesperdicio || [])
    const tagMap = mapById(tagsCatalogo || [])
    const contratoMap = new Map((contratos || []).map((item) => [item.codigo, item.nome || item.codigo]))
    const usuarioMap = new Map(usuarios.map((item) => [item.matricula, item.nome || String(item.matricula)]))

    const participantes = new Set<number>()
    const relevancias = praticas
      .map((pratica) => pratica.relevancia)
      .filter((value): value is number => typeof value === 'number')

    const rows = praticas.map((pratica) => {
      participantes.add(pratica.matricula_cadastrante)
      const envolvidos = (pratica.envolvidos || [])
        .map((envolvido) => envolvido.matricula_envolvido)
        .filter((matricula): matricula is number => typeof matricula === 'number')

      envolvidos.forEach((matricula) => participantes.add(matricula))

      const contratoNome = resolveContrato(pratica.contrato, contratoMap)
      const areaAplicadaNome = resolveAreaAplicada(pratica.area_aplicada, areaMap)
      const tagNomes = (pratica.tags || []).map((tag) => tagMap.get(tag) || 'Tag nao encontrada')

      return {
        areaAplicada: areaAplicadaNome,
        cadastrante: usuarioMap.get(pratica.matricula_cadastrante) || 'Usuario nao encontrado',
        categoria: resolveCatalogName(pratica.categoria, categoriaMap, 'Sem categoria'),
        comentarioValidacao: pratica.comentario_validacao || null,
        contrato: contratoNome,
        createdAt: pratica.created_at,
        dataImplantacao: pratica.data_implantacao,
        descricao: pratica.descricao || null,
        descricaoProblema: pratica.descricao_problema || null,
        eliminaDesperdicio: resolveCatalogName(pratica.elimina_desperdicio, eliminaMap, 'Nao informado'),
        eliminada: !!pratica.eliminada,
        envolvidos: envolvidos.map((matricula) => usuarioMap.get(matricula) || 'Usuario nao encontrado'),
        fabricouDispositivo: pratica.fabricou_dispositivo,
        geral: pratica.geral,
        id: pratica.id,
        likes: pratica.likes || 0,
        objetivo: pratica.objetivo || null,
        pilar: resolveCatalogName(pratica.pilar, pilarMap, 'Sem pilar'),
        projeto: pratica.projeto || null,
        relevancia: pratica.relevancia,
        responsavelEtapa: pratica.responsavel_etapa
          ? usuarioMap.get(pratica.responsavel_etapa) || 'Usuario nao encontrado'
          : 'Nao informado',
        resultados: pratica.resultados || null,
        status: pratica.status || 'Sem status',
        tags: tagNomes,
        titulo: pratica.titulo,
        updatedAt: pratica.updated_at,
        validacao: pratica.validacao,
        visualizacoes: pratica.visualizacoes || 0,
      }
    })

    const summary = {
      averageRelevance:
        relevancias.length > 0
          ? Number((relevancias.reduce((acc, value) => acc + value, 0) / relevancias.length).toFixed(1))
          : null,
      distinctParticipants: participantes.size,
      totalPractices: praticas.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        charts: {
          byAppliedArea: toChartItems(countRows(rows, (row) => row.areaAplicada || 'Sem area aplicada')),
          byCategory: toChartItems(countRows(rows, (row) => row.categoria || 'Sem categoria')),
          byLocal: toChartItems(countRows(rows, (row) => row.contrato || 'Sem contrato')),
          byPillar: toChartItems(countRows(rows, (row) => row.pilar || 'Sem pilar')),
          byStatus: toChartItems(countRows(rows, (row) => row.status || 'Sem status')),
        },
        generatedAt: new Date().toISOString(),
        rows,
        summary,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar relatorio geral de boas praticas:', error)
    return NextResponse.json({ error: 'Erro interno ao gerar relatorio' }, { status: 500 })
  }
}

async function fetchAllPractices() {
  const rows: PraticaRow[] = []
  let page = 0

  while (true) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .select(
        `
          id,
          titulo,
          descricao,
          descricao_problema,
          objetivo,
          area_aplicada,
          data_implantacao,
          pilar,
          elimina_desperdicio,
          contrato,
          status,
          relevancia,
          resultados,
          geral,
          responsavel_etapa,
          categoria,
          fabricou_dispositivo,
          projeto,
          matricula_cadastrante,
          tags,
          created_at,
          updated_at,
          validacao,
          comentario_validacao,
          eliminada,
          visualizacoes,
          likes,
          envolvidos:boaspraticas_envolvidos(matricula_envolvido)
        `,
      )
      .order('created_at', { ascending: false })
      .range(from, to)
      .returns<PraticaRow[]>()

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

async function fetchUsuarios(matriculas: number[]) {
  if (matriculas.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('matricula, nome')
    .in('matricula', matriculas)
    .returns<UserRow[]>()

  if (error) {
    throw error
  }

  return data || []
}

function collectMatriculas(praticas: PraticaRow[]) {
  const matriculas = new Set<number>()

  praticas.forEach((pratica) => {
    matriculas.add(pratica.matricula_cadastrante)
    if (pratica.responsavel_etapa) {
      matriculas.add(pratica.responsavel_etapa)
    }
    ;(pratica.envolvidos || []).forEach((envolvido) => {
      if (typeof envolvido.matricula_envolvido === 'number') {
        matriculas.add(envolvido.matricula_envolvido)
      }
    })
  })

  return Array.from(matriculas)
}

function mapById(rows: CatalogRow[]) {
  return new Map(rows.map((item) => [item.id, item.nome || String(item.id)]))
}

function resolveCatalogName(id: number | null, map: Map<number, string>, fallback: string) {
  if (!id) {
    return fallback
  }

  return map.get(id) || fallback
}

function resolveContrato(codigo: string | null, map: Map<string, string>) {
  if (!codigo) {
    return 'Sem contrato'
  }

  return map.get(codigo) || codigo
}

function resolveAreaAplicada(value: string | number | null, map: Map<number, string>) {
  if (value === null || value === undefined || value === '') {
    return 'Sem area aplicada'
  }

  const numeric = Number(value)
  if (Number.isInteger(numeric) && map.has(numeric)) {
    return map.get(numeric) || String(value)
  }

  if (Number.isInteger(numeric)) {
    return 'Area aplicada nao encontrada'
  }

  return String(value)
}

function countRows<T>(rows: T[], getLabel: (row: T) => string) {
  const counts = new Map<string, number>()

  rows.forEach((row) => {
    const label = getLabel(row)
    counts.set(label, (counts.get(label) || 0) + 1)
  })

  return counts
}

function toChartItems(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([label, total]) => ({
      key: toSafeChartKey(label),
      label,
      total,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

function toSafeChartKey(label: string) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sem-informacao'
}
