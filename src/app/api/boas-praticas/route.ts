import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { StatusBoaPratica } from '@/types/boas-praticas'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const url = new URL(request.url)
    const search = url.searchParams.get('search') || undefined
    const status = url.searchParams.get('status') as StatusBoaPratica | null
    const categoria = url.searchParams.get('categoria')
    const pilar = url.searchParams.get('pilar')
    const area_aplicada = url.searchParams.get('area_aplicada')
    const tag = url.searchParams.get('tag')
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('boaspraticas_praticas')
      .select('*', { count: 'exact' })
      .eq('contrato', auth.user?.contrato_raiz)

    if (search) query = query.ilike('titulo', `%${search}%`)
    if (status) query = query.eq('status', status)
    if (categoria) query = query.eq('categoria', Number(categoria))
    if (pilar) query = query.eq('pilar', Number(pilar))
    if (area_aplicada) query = query.eq('area_aplicada', area_aplicada)
    if (tag) query = query.contains('tags', [Number(tag)])

    query = query.order('created_at', { ascending: false }).range(start, end)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar boas práticas' }, { status: 500 })

    return NextResponse.json({ success: true, data, page, limit, total: count || 0 })
  } catch (error) {
    console.error('Erro interno ao listar boas práticas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const body = await request.json()

    const areaAplicada =
      typeof body.area_aplicada === 'string'
        ? body.area_aplicada.trim()
        : body.area_aplicada_id
          ? String(body.area_aplicada_id).trim()
          : null
    const pilarId = Number(body.pilar_id ?? body.pilar) || null
    const eliminaDesperdicioId = Number(body.elimina_desperdicio_id ?? body.elimina_desperdicio) || null
    const categoriaId = Number(body.categoria_id ?? body.categoria) || null
    const envolvidos: number[] = Array.isArray(body.envolvidos) ? body.envolvidos : []
    const contratoCodigo = auth.user?.contrato_raiz ?? null

    let responsavelEtapa: number | null = null
    if (contratoCodigo) {
      const { data: respContrato } = await supabase
        .from('boaspraticas_responsaveis_contratos')
        .select('responsavel_sesmt')
        .eq('codigo_contrato', contratoCodigo)
        .maybeSingle()
      if (respContrato?.responsavel_sesmt) {
        responsavelEtapa = respContrato.responsavel_sesmt
      }
    }

    const insert = {
      titulo: body.titulo,
      descricao: body.descricao,
      descricao_problema: body.descricao_problema,
      objetivo: body.objetivo,
      area_aplicada: areaAplicada || null,
      data_implantacao: body.data_implantacao ?? null,
      pilar: pilarId,
      elimina_desperdicio: eliminaDesperdicioId,
      contrato: contratoCodigo,
      status: (body.status as StatusBoaPratica) || 'Aguardando avaliacao do sesmt',
      relevancia: body.relevancia ?? null,
      resultados: body.resultados ?? null,
      geral: !!body.geral,
      responsavel_etapa: responsavelEtapa,
      categoria: categoriaId,
      fabricou_dispositivo: !!body.fabricou_dispositivo,
      projeto: body.projeto ?? null,
      matricula_cadastrante: auth.user?.matricula,
      tags: Array.isArray(body.tags) ? body.tags : null
    }

    const { data, error } = await supabase
      .from('boaspraticas_praticas')
      .insert(insert)
      .select('*')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Erro ao criar boa prática' }, { status: 500 })

    if (envolvidos.length > 0) {
      await supabase
        .from('boaspraticas_envolvidos')
        .insert(envolvidos.map(matricula => ({ pratica_id: data.id, matricula_envolvido: matricula })))
    }

    return NextResponse.json({ success: true, data: { ...data, envolvidos } })
  } catch (error) {
    console.error('Erro interno ao criar boa prática:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
