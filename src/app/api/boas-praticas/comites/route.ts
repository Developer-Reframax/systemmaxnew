import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

type ComiteTipo = 'local' | 'corporativo'

type ComiteRow = {
  id: number
  nome: string
  descricao?: string | null
  tipo: ComiteTipo
  codigo_contrato?: string | null
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

type ComiteResponse = ComiteRow & {
  contrato_nome?: string | null
  membros: {
    matricula: number
    nome?: string | null
    email?: string | null
    contrato_raiz?: string | null
  }[]
}

type MembroRow = {
  comite_id: number
  matricula: number
  usuario?: {
    matricula?: number
    nome?: string | null
    email?: string | null
    contrato_raiz?: string | null
  } | null
}

type ContratoRow = { codigo: string; nome?: string | null }
type UsuarioRow = {
  matricula: number
  nome?: string | null
  email?: string | null
  contrato_raiz?: string | null
  status?: string | null
}

type ComitePayload = {
  nome?: string
  descricao?: string
  tipo?: string
  codigo_contrato?: string | null
  membros?: unknown[]
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ensureTipo = (tipo?: string | null): tipo is ComiteTipo =>
  tipo === 'local' || tipo === 'corporativo'

async function hydrateComites(comites: ComiteRow[]): Promise<ComiteResponse[]> {
  if (comites.length === 0) return []

  const comiteIds = comites.map((c) => c.id)
  const contratoCodes = comites
    .map((c) => c.codigo_contrato)
    .filter((c): c is string => Boolean(c))

  const membrosRes = await supabase
    .from('boaspraticas_comite_membros')
    .select('comite_id, matricula, usuario:usuarios(matricula, nome, email, contrato_raiz)')
    .in('comite_id', comiteIds)

  const contratosRes = contratoCodes.length
    ? await supabase.from('contratos').select('codigo, nome').in('codigo', contratoCodes)
    : { data: [] as unknown[] }

  const membrosPorComite = new Map<number, ComiteResponse['membros']>()
  const membrosData = (membrosRes.data ?? []) as unknown as MembroRow[]
  if (membrosData.length > 0) {
    membrosData.forEach((item) => {
      const list = membrosPorComite.get(item.comite_id) || []
      list.push({
        matricula: item.matricula,
        nome: item.usuario?.nome || null,
        email: item.usuario?.email || null,
        contrato_raiz: item.usuario?.contrato_raiz || null
      })
      membrosPorComite.set(item.comite_id, list)
    })
  }

  const contratoMap = new Map<string, string | null>()
  const contratosData = (contratosRes.data ?? []) as unknown as ContratoRow[]
  contratosData.forEach((c) => contratoMap.set(c.codigo, c.nome || null))

  return comites.map((c) => ({
    ...c,
    contrato_nome: c.codigo_contrato ? contratoMap.get(c.codigo_contrato) || null : null,
    membros: membrosPorComite.get(c.id) || []
  }))
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tipo = searchParams.get('tipo')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    let query = supabase
      .from('boaspraticas_comite')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('nome', `%${search}%`)
    }

    if (tipo && ensureTipo(tipo)) {
      query = query.eq('tipo', tipo)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao listar comites:', error)
      return NextResponse.json({ error: 'Erro ao listar comites' }, { status: 500 })
    }

    const comiteRows = (data ?? []) as unknown as ComiteRow[]
    const hydrated = await hydrateComites(comiteRows)

    return NextResponse.json({
      success: true,
      data: hydrated,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Erro na API de comites (GET):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = (await request.json()) as ComitePayload
    const { nome, descricao, tipo, codigo_contrato, membros } = body || {}

    if (!nome || !tipo || !ensureTipo(tipo)) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: nome e tipo (local ou corporativo)' },
        { status: 400 }
      )
    }

    const membrosArray: number[] = Array.isArray(membros)
      ? Array.from(
          new Set(
            membros
              .map((m: unknown) => Number(m))
              .filter((m) => Number.isFinite(m) && !Number.isNaN(m))
          )
        )
      : []

    if (membrosArray.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos um membro' }, { status: 400 })
    }

    let contratoValidado: string | null = null
    let contratoNome: string | null = null
    if (tipo === 'local') {
      if (!codigo_contrato) {
        return NextResponse.json({ error: 'Contrato obrigatorio para comite local' }, { status: 400 })
      }
      const { data: contrato } = await supabase
        .from('contratos')
        .select('codigo, nome')
        .eq('codigo', codigo_contrato)
        .single()
      const contratoData = (contrato as ContratoRow | null) || null
      if (!contratoData) {
        return NextResponse.json({ error: 'Contrato informado nao existe' }, { status: 400 })
      }
      contratoValidado = codigo_contrato
      contratoNome = contratoData.nome || null
    }

    if (tipo === 'corporativo') {
      const { data: existingCorp } = await supabase
        .from('boaspraticas_comite')
        .select('id')
        .eq('tipo', 'corporativo')
        .limit(1)
        .maybeSingle()

      if (existingCorp) {
        return NextResponse.json(
          { error: 'Ja existe um comite corporativo cadastrado' },
          { status: 409 }
        )
      }
    } else if (contratoValidado) {
      const { data: existingLocal } = await supabase
        .from('boaspraticas_comite')
        .select('id')
        .eq('tipo', 'local')
        .eq('codigo_contrato', contratoValidado)
        .limit(1)
        .maybeSingle()

      if (existingLocal) {
        return NextResponse.json(
          { error: 'Ja existe um comite local para este contrato' },
          { status: 409 }
        )
      }
    }

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('matricula, nome, email, contrato_raiz, status')
      .in('matricula', membrosArray)

    const usuariosData = (usuarios ?? []) as unknown as UsuarioRow[]

    if (usuariosError || usuariosData.length !== membrosArray.length) {
      return NextResponse.json({ error: 'Alguns membros nao foram encontrados' }, { status: 400 })
    }

    const inativos = usuariosData.filter((u) => u.status && u.status !== 'ativo')
    if (inativos.length > 0) {
      return NextResponse.json({ error: 'Todos os membros devem estar ativos' }, { status: 400 })
    }

    if (tipo === 'local') {
      const contratosDiferentes = usuariosData.filter(
        (u) => u.contrato_raiz && u.contrato_raiz !== contratoValidado
      )
      if (contratosDiferentes.length > 0) {
        return NextResponse.json(
          { error: 'Todos os membros do comite local devem pertencer ao contrato selecionado' },
          { status: 400 }
        )
      }
    }

    const now = new Date().toISOString()
    const { data: comite, error: insertError } = await supabase
      .from('boaspraticas_comite')
      .insert({
        nome,
        descricao: descricao || null,
        tipo,
        codigo_contrato: tipo === 'local' ? contratoValidado : null,
        created_by: auth.user?.matricula || null,
        created_at: now,
        updated_at: now
      })
      .select()
      .single()

    if (insertError || !comite) {
      console.error('Erro ao criar comite:', insertError)
      return NextResponse.json({ error: 'Erro ao criar comite' }, { status: 500 })
    }

    const comiteRow = (comite as unknown as ComiteRow) || null
    if (!comiteRow) {
      return NextResponse.json({ error: 'Erro ao criar comite' }, { status: 500 })
    }

    const memberRows = membrosArray.map((matricula) => ({
      comite_id: comiteRow.id,
      matricula
    }))

    const { error: membrosInsertError } = await supabase
      .from('boaspraticas_comite_membros')
      .insert(memberRows)

    if (membrosInsertError) {
      console.error('Erro ao inserir membros do comite:', membrosInsertError)
      await supabase.from('boaspraticas_comite').delete().eq('id', comiteRow.id)
      return NextResponse.json({ error: 'Erro ao salvar membros do comite' }, { status: 500 })
    }

    const membrosDetalhados = membrosArray.map((matricula) => {
      const usuario = usuariosData.find((u) => u.matricula === matricula)
      return {
        matricula,
        nome: usuario?.nome || null,
        email: usuario?.email || null,
        contrato_raiz: usuario?.contrato_raiz || null
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          ...comiteRow,
          contrato_nome: contratoNome,
          membros: membrosDetalhados
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro na API de comites (POST):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
