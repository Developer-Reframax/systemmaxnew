import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { StatusBoaPratica } from '@/types/boas-praticas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const { id } = await context.params

    const { data, error } = await supabase
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

    const tagsIds = Array.isArray(data.tags) ? data.tags.filter((t: unknown) => typeof t === 'number') : []
    const envolvidosMatriculas = Array.isArray(data.envolvidos)
      ? data.envolvidos.map((ev: any) => ev.matricula_envolvido).filter((m: unknown) => typeof m === 'number')
      : []

    const [pilarRes, categoriaRes, eliminaRes, areaRes, tagsRes, usuariosRes, autorRes] = await Promise.all([
      data.pilar
        ? supabase.from('boaspraticas_pilar').select('nome').eq('id', data.pilar).maybeSingle()
        : Promise.resolve({ data: null }),
      data.categoria
        ? supabase.from('boaspraticas_categoria').select('nome').eq('id', data.categoria).maybeSingle()
        : Promise.resolve({ data: null }),
      data.elimina_desperdicio
        ? supabase.from('boaspraticas_elimina_desperdicio').select('nome').eq('id', data.elimina_desperdicio).maybeSingle()
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
    ])

    const usuariosMap = new Map<number, string>((usuariosRes.data || []).map((u: any) => [u.matricula, u.nome]))

    const { tags: _tags, ...rest } = data

    const enriched = {
      ...rest,
      pilar_nome: pilarRes?.data?.nome || null,
      categoria_nome: categoriaRes?.data?.nome || null,
      elimina_desperdicio_nome: eliminaRes?.data?.nome || null,
      area_aplicada_nome: typeof data.area_aplicada === 'string' ? data.area_aplicada : areaRes?.data?.nome || null,
      autor_nome: autorRes?.data?.nome || null,
      tags_detalhes: (tagsRes.data || []).map((t: any) => ({ id: t.id, nome: t.nome, cor: t.cor })),
      envolvidos: Array.isArray(data.envolvidos)
        ? data.envolvidos.map((ev: any) => ({
            ...ev,
            nome_envolvido: usuariosMap.get(ev.matricula_envolvido)
          }))
        : [],
      evidencias: Array.isArray(data.evidencias)
        ? data.evidencias.map((ev: any) => ({
            ...ev,
            nome_arquivo: ev.url ? ev.url.split('/').pop() || 'evidencia' : 'evidencia'
          }))
        : []
    }

    return NextResponse.json({ success: true, data: enriched })
  } catch (e) {
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
    const body = await request.json()

    const { data: pratica } = await supabase
      .from('boaspraticas_praticas')
      .select('matricula_cadastrante')
      .eq('id', id)
      .single()

    const canEdit =
      pratica &&
      (pratica.matricula_cadastrante === auth.user?.matricula || ['Admin', 'Editor'].includes(String(auth.user?.role)))
    if (!canEdit) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const update = {
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

    const { data, error } = await supabase
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
          .insert(body.envolvidos.map((matricula: number) => ({ pratica_id: id, matricula_envolvido: matricula })))
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
