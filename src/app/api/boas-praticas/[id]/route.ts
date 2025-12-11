import { NextRequest, NextResponse } from 'next/server'
import { createClient, type PostgrestResponse, type PostgrestSingleResponse } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { StatusBoaPratica } from '@/types/boas-praticas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Envolvido = { matricula_envolvido: number } & Record<string, unknown>
type Evidencia = { url: string | null } & Record<string, unknown>
type PraticaWithRelations = {
  pilar: number | null
  categoria: number | null
  elimina_desperdicio: number | null
  area_aplicada: number | string | null
  tags: number[] | null
  matricula_cadastrante: number | null
  envolvidos: Envolvido[] | null
  evidencias: Evidencia[] | null
} & Record<string, unknown>

type TagRow = { id: number; nome: string; cor: string }
type UsuarioRow = { matricula: number; nome: string }

type BoaPraticaUpdateBody = {
  titulo?: string
  descricao?: string
  descricao_problema?: string
  objetivo?: string
  area_aplicada?: number | string | null
  data_implantacao?: string | null
  pilar?: number | null
  elimina_desperdicio?: number | null
  status?: StatusBoaPratica
  relevancia?: number | null
  resultados?: string | null
  geral?: boolean
  responsavel_etapa?: string | null
  categoria?: number | null
  fabricou_dispositivo?: boolean
  projeto?: string | null
  tags?: number[] | null
  envolvidos?: number[]
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params

    const { data, error }: PostgrestSingleResponse<PraticaWithRelations> = await supabase
      .from('boaspraticas_praticas')
      .select(
        `*,
        envolvidos:boaspraticas_envolvidos(matricula_envolvido),
        evidencias:boaspraticas_evidencias(*)
      `
      )
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })

    const { tags: tagsRaw, ...restWithoutTags } = data
    const tagsIds = Array.isArray(tagsRaw) ? tagsRaw.filter((t: unknown): t is number => typeof t === 'number') : []
    const envolvidosMatriculas = Array.isArray(data.envolvidos)
      ? data.envolvidos
          .map((ev: Envolvido) => ev.matricula_envolvido)
          .filter((m: unknown): m is number => typeof m === 'number')
      : []

    const [pilarRes, categoriaRes, eliminaRes, areaRes, tagsRes, usuariosRes, autorRes] = await Promise.all([
      data.pilar
        ? supabase.from('boaspraticas_pilar').select('nome').eq('id', data.pilar).maybeSingle()
        : Promise.resolve({ data: null }),
      data.categoria
        ? supabase.from('boaspraticas_categoria').select('nome').eq('id', data.categoria).maybeSingle()
        : Promise.resolve({ data: null }),
      data.elimina_desperdicio
        ? supabase
            .from('boaspraticas_elimina_desperdicio')
            .select('nome')
            .eq('id', data.elimina_desperdicio)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      typeof data.area_aplicada === 'number'
        ? supabase.from('boaspraticas_area_aplicada').select('nome').eq('id', data.area_aplicada).maybeSingle()
        : Promise.resolve({ data: null }),
      tagsIds.length
        ? supabase.from('boaspraticas_tags_catalogo').select('id, nome, cor').in('id', tagsIds)
        : Promise.resolve({ data: [] }),
      envolvidosMatriculas.length
        ? supabase.from('usuarios').select('matricula, nome').in('matricula', envolvidosMatriculas)
        : Promise.resolve({ data: [] }),
      data.matricula_cadastrante
        ? supabase.from('usuarios').select('nome').eq('matricula', data.matricula_cadastrante).maybeSingle()
        : Promise.resolve({ data: null })
    ]) as [
      PostgrestSingleResponse<{ nome: string }>,
      PostgrestSingleResponse<{ nome: string }>,
      PostgrestSingleResponse<{ nome: string }>,
      PostgrestSingleResponse<{ nome: string }>,
      PostgrestResponse<TagRow>,
      PostgrestResponse<UsuarioRow>,
      PostgrestSingleResponse<{ nome: string }>
    ]

    const usuariosMap = new Map<number, string>((usuariosRes.data || []).map((u) => [u.matricula, u.nome]))

    const enriched = {
      ...restWithoutTags,
      pilar_nome: pilarRes?.data?.nome || null,
      categoria_nome: categoriaRes?.data?.nome || null,
      elimina_desperdicio_nome: eliminaRes?.data?.nome || null,
      area_aplicada_nome: typeof data.area_aplicada === 'string' ? data.area_aplicada : areaRes?.data?.nome || null,
      autor_nome: autorRes?.data?.nome || null,
      tags_detalhes: (tagsRes.data || []).map((t) => ({ id: t.id, nome: t.nome, cor: t.cor })),
      envolvidos: Array.isArray(data.envolvidos)
        ? data.envolvidos.map((ev) => ({
            ...ev,
            nome_envolvido: usuariosMap.get(ev.matricula_envolvido)
          }))
        : [],
      evidencias: Array.isArray(data.evidencias)
        ? data.evidencias.map((ev) => ({
            ...ev,
            nome_arquivo: ev.url ? ev.url.split('/').pop() || 'evidencia' : 'evidencia'
          }))
        : []
    }

    return NextResponse.json({ success: true, data: enriched })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params
    const body = (await request.json()) as BoaPraticaUpdateBody

    const { data: pratica }: PostgrestSingleResponse<{ matricula_cadastrante: number | null }> = await supabase
      .from('boaspraticas_praticas')
      .select('matricula_cadastrante')
      .eq('id', id)
      .single()

    const canEdit =
      pratica &&
      (pratica.matricula_cadastrante === auth.user?.matricula || ['Admin', 'Editor'].includes(String(auth.user?.role)))
    if (!canEdit) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const update: Partial<BoaPraticaUpdateBody> = {
      titulo: body.titulo,
      descricao: body.descricao,
      descricao_problema: body.descricao_problema,
      objetivo: body.objetivo,
      area_aplicada: body.area_aplicada ?? null,
      data_implantacao: body.data_implantacao ?? null,
      pilar: body.pilar ?? null,
      elimina_desperdicio: body.elimina_desperdicio ?? null,
      status: (body.status as StatusBoaPratica) || undefined,
      relevancia: body.relevancia ?? null,
      resultados: body.resultados ?? null,
      geral: typeof body.geral === 'boolean' ? body.geral : undefined,
      responsavel_etapa: body.responsavel_etapa ?? null,
      categoria: body.categoria ?? null,
      fabricou_dispositivo: typeof body.fabricou_dispositivo === 'boolean' ? body.fabricou_dispositivo : undefined,
      projeto: body.projeto ?? null,
      tags: Array.isArray(body.tags) ? body.tags : undefined
    }

    const { data, error }: PostgrestSingleResponse<Record<string, unknown>> = await supabase
      .from('boaspraticas_praticas')
      .update(update)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao atualizar boa pratica' }, { status: 500 })

    if (Array.isArray(body.envolvidos)) {
      await supabase.from('boaspraticas_envolvidos').delete().eq('pratica_id', id)
      if (body.envolvidos.length > 0) {
        await supabase
          .from('boaspraticas_envolvidos')
          .insert(body.envolvidos.map((matricula) => ({ pratica_id: id, matricula_envolvido: matricula })))
      }
    }

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
