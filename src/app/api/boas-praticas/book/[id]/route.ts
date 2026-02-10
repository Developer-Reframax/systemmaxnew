import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PraticaRow = {
  id: string
  contrato?: string | null
  pilar?: number | null
  categoria?: number | null
  elimina_desperdicio?: number | null
  area_aplicada?: number | string | null
  matricula_cadastrante?: number | null
  tags?: unknown
  envolvidos?: { matricula_envolvido: number }[]
  evidencias?: { id: string; url: string; descricao?: string | null; is_video: boolean }[]
}

type TagRow = { id: number; nome: string; cor?: string | null }
type UsuarioRow = { matricula: number; nome?: string | null }
type LikeRow = { matricula: number }

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
      .eq('validacao', true)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ error: 'Boa pratica nao encontrada' }, { status: 404 })

    // enriquece dados
    const base = data as unknown as PraticaRow

    const tagsIds = Array.isArray(base.tags) ? base.tags.filter((t: unknown) => typeof t === 'number') : []
    const envolvidosMatriculas = Array.isArray(base.envolvidos)
      ? base.envolvidos.map((ev) => ev.matricula_envolvido).filter((m: unknown) => typeof m === 'number')
      : []

    const [pilarRes, categoriaRes, eliminaRes, areaRes, tagsRes, autorRes, likedRes, likesRes, contratoRes] = await Promise.all([
      base.pilar
        ? supabase.from('boaspraticas_pilar').select('nome').eq('id', base.pilar).maybeSingle()
        : Promise.resolve({ data: null }),
      base.categoria
        ? supabase.from('boaspraticas_categoria').select('nome').eq('id', base.categoria).maybeSingle()
        : Promise.resolve({ data: null }),
      base.elimina_desperdicio
        ? supabase.from('boaspraticas_elimina_desperdicio').select('nome').eq('id', base.elimina_desperdicio).maybeSingle()
        : Promise.resolve({ data: null }),
      typeof base.area_aplicada === 'number'
        ? supabase.from('boaspraticas_area_aplicada').select('nome').eq('id', base.area_aplicada).maybeSingle()
        : Promise.resolve({ data: null }),
      tagsIds.length
        ? supabase.from('boaspraticas_tags_catalogo').select('id, nome, cor').in('id', tagsIds)
        : Promise.resolve({ data: [] }),
      base.matricula_cadastrante
        ? supabase.from('usuarios').select('nome').eq('matricula', base.matricula_cadastrante).maybeSingle()
        : Promise.resolve({ data: null }),
      auth.user?.matricula
        ? supabase
            .from('boaspraticas_likes')
            .select('id')
            .eq('pratica_id', id)
            .eq('matricula', auth.user.matricula)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from('boaspraticas_likes').select('matricula').eq('pratica_id', id),
      base.contrato
        ? supabase.from('contratos').select('nome').eq('codigo', base.contrato).maybeSingle()
        : Promise.resolve({ data: null })
    ])

    const likesMatriculas = Array.isArray(likesRes?.data)
      ? (likesRes.data as LikeRow[]).map((l) => l.matricula).filter((m): m is number => typeof m === 'number')
      : []

    const usuariosMatriculas = Array.from(new Set([...envolvidosMatriculas, ...likesMatriculas]))

    const usuariosRes = usuariosMatriculas.length
      ? await supabase.from('usuarios').select('matricula, nome').in('matricula', usuariosMatriculas)
      : { data: [] }

    const usuariosMap = new Map<number, string>(
      ((usuariosRes.data || []) as UsuarioRow[]).map((u) => [u.matricula, u.nome || ''])
    )

    const enriched = {
      ...base,
      pilar_nome: pilarRes?.data?.nome || null,
      categoria_nome: categoriaRes?.data?.nome || null,
      elimina_desperdicio_nome: eliminaRes?.data?.nome || null,
      area_aplicada_nome: typeof base.area_aplicada === 'string' ? base.area_aplicada : areaRes?.data?.nome || null,
      autor_nome: autorRes?.data?.nome || null,
      tags_detalhes: ((tagsRes.data || []) as TagRow[]).map((t) => ({ id: t.id, nome: t.nome, cor: t.cor })),
      envolvidos: Array.isArray(base.envolvidos)
        ? base.envolvidos.map((ev) => ({
            ...ev,
            nome_envolvido: usuariosMap.get(ev.matricula_envolvido)
          }))
        : [],
      evidencias: Array.isArray(base.evidencias)
        ? base.evidencias.map((ev) => ({
            ...ev,
            nome_arquivo: ev.url ? ev.url.split('/').pop() || 'evidencia' : 'evidencia'
          }))
        : [],
      liked: Boolean(likedRes?.data),
      likes: likesMatriculas.length,
      contrato_codigo: base.contrato || null,
      contrato_nome: contratoRes?.data?.nome || null,
      likes_usuarios: likesMatriculas.map((matricula) => ({
        matricula,
        nome: usuariosMap.get(matricula) || null
      }))
    }

    return NextResponse.json({ success: true, data: enriched })
  } catch (err) {
    console.error('Erro no book detalhe:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { id } = await context.params
    const body = await request.json()
    const action = body?.action

    if (action === 'like') {
      if (!auth.user?.matricula) {
        return NextResponse.json({ error: 'Usuario nao identificado' }, { status: 400 })
      }

      const { data: existing } = await supabase
        .from('boaspraticas_likes')
        .select('id')
        .eq('pratica_id', id)
        .eq('matricula', auth.user.matricula)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ success: true, alreadyLiked: true })
      }

      const { error: likeError } = await supabase
        .from('boaspraticas_likes')
        .insert({ pratica_id: id, matricula: auth.user.matricula })

      if (likeError) {
        console.error('Erro ao registrar like:', likeError)
        return NextResponse.json({ error: 'Erro ao registrar like' }, { status: 500 })
      }

      await supabase.rpc('increment_like_pratica', { pratica_id: id })

      return NextResponse.json({ success: true })
    }

    if (action === 'view') {
      const { error: viewError } = await supabase.rpc('increment_visualizacao_pratica', { pratica_id: id })
      if (viewError) {
        console.error('Erro ao registrar visualizacao:', viewError)
        return NextResponse.json({ error: 'Erro ao registrar visualizacao' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
  } catch (err) {
    console.error('Erro no book detalhe POST:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
