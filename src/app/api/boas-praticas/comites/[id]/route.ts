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

async function buildComiteResponse(comite: ComiteRow): Promise<ComiteResponse | null> {
  if (!comite) return null

  const membrosRes = await supabase
    .from('boaspraticas_comite_membros')
    .select('comite_id, matricula, usuario:usuarios(matricula, nome, email, contrato_raiz)')
    .eq('comite_id', comite.id)

  const contratoRes = comite.codigo_contrato
    ? await supabase
        .from('contratos')
        .select('codigo, nome')
        .eq('codigo', comite.codigo_contrato)
        .single()
    : { data: null as ContratoRow | null }

  const membrosData = (membrosRes.data ?? []) as unknown as MembroRow[]
  const membros =
    membrosData.map((item) => ({
      matricula: item.matricula,
      nome: item.usuario?.nome || null,
      email: item.usuario?.email || null,
      contrato_raiz: item.usuario?.contrato_raiz || null
    })) || []

  return {
    ...comite,
    contrato_nome: comite.codigo_contrato ? contratoRes.data?.nome || null : null,
    membros
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { id } = await params
    const comiteId = Number(id)
    if (Number.isNaN(comiteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('boaspraticas_comite')
      .select('*')
      .eq('id', comiteId)
      .single()

    const comiteData = (data as unknown as ComiteRow | null) || null

    if (error || !comiteData) {
      return NextResponse.json({ error: 'Comite nao encontrado' }, { status: 404 })
    }

    const resposta = await buildComiteResponse(comiteData)
    return NextResponse.json({ success: true, data: resposta })
  } catch (error) {
    console.error('Erro na API de comites (GET by id):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const comiteId = Number(id)
    if (Number.isNaN(comiteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const body = (await request.json()) as ComitePayload
    const { nome, descricao, tipo, codigo_contrato, membros } = body || {}

    if (!nome || !tipo || !ensureTipo(tipo)) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: nome e tipo (local ou corporativo)' },
        { status: 400 }
      )
    }

    const { data: existente } = await supabase
      .from('boaspraticas_comite')
      .select('id, tipo, codigo_contrato')
      .eq('id', comiteId)
      .single()

    const existenteData = (existente as unknown as ComiteRow | null) || null

    if (!existenteData) {
      return NextResponse.json({ error: 'Comite nao encontrado' }, { status: 404 })
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
        .neq('id', comiteId)
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
        .neq('id', comiteId)
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
    const { data: atualizado, error: updateError } = await supabase
      .from('boaspraticas_comite')
      .update({
        nome,
        descricao: descricao || null,
        tipo,
        codigo_contrato: tipo === 'local' ? contratoValidado : null,
        updated_at: now
      })
      .eq('id', comiteId)
      .select()
      .single()

    if (updateError || !atualizado) {
      console.error('Erro ao atualizar comite:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar comite' }, { status: 500 })
    }

    const atualizadoRow = (atualizado as unknown as ComiteRow) || null
    if (!atualizadoRow) {
      return NextResponse.json({ error: 'Erro ao atualizar comite' }, { status: 500 })
    }

    const { error: deleteMembersError } = await supabase
      .from('boaspraticas_comite_membros')
      .delete()
      .eq('comite_id', comiteId)

    if (deleteMembersError) {
      console.error('Erro ao limpar membros do comite:', deleteMembersError)
      return NextResponse.json({ error: 'Erro ao atualizar membros do comite' }, { status: 500 })
    }

    const memberRows = membrosArray.map((matricula) => ({
      comite_id: comiteId,
      matricula
    }))

    const { error: membrosInsertError } = await supabase
      .from('boaspraticas_comite_membros')
      .insert(memberRows)

    if (membrosInsertError) {
      console.error('Erro ao inserir membros do comite:', membrosInsertError)
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

    return NextResponse.json({
      success: true,
      data: {
        ...atualizadoRow,
        contrato_nome: contratoNome,
        membros: membrosDetalhados
      }
    })
  } catch (error) {
    console.error('Erro na API de comites (PUT):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    if (!auth.user?.role || !['Admin', 'Editor'].includes(String(auth.user.role))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { id } = await params
    const comiteId = Number(id)
    if (Number.isNaN(comiteId)) {
      return NextResponse.json({ error: 'ID invalido' }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('boaspraticas_comite')
      .select('id')
      .eq('id', comiteId)
      .single()

    const existenteData = (existente as unknown as ComiteRow | null) || null

    if (!existenteData) {
      return NextResponse.json({ error: 'Comite nao encontrado' }, { status: 404 })
    }

    await supabase.from('boaspraticas_comite_membros').delete().eq('comite_id', comiteId)
    const { error } = await supabase.from('boaspraticas_comite').delete().eq('id', comiteId)

    if (error) {
      console.error('Erro ao excluir comite:', error)
      return NextResponse.json({ error: 'Erro ao excluir comite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na API de comites (DELETE):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
