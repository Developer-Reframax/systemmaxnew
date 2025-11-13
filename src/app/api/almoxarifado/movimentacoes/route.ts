import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: jwt.JwtPayload | string

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se o usuário tem permissão para visualizar movimentações
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('matricula, funcao, contrato_raiz')
      .eq('matricula', (decoded as jwt.JwtPayload).matricula)
      .single()

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar permissões - apenas almoxarifado, gestores e administradores podem ver todas as movimentações
    const canViewAll = ['Almoxarifado', 'Gestor Almoxarifado', 'Administrador'].includes(usuario.funcao)

    // Obter parâmetros de filtro da query string
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const tipo = searchParams.get('tipo') // 'entrada', 'saida', 'ajuste' ou null para todos
    const itemId = searchParams.get('item_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const search = searchParams.get('search') // busca por nome do item ou responsável

    const offset = (page - 1) * limit

    // Construir query base
    let query = supabase
      .from('movimentacoes_estoque')
      .select(`
        id,
        item_id,
        tipo,
        quantidade,
        estoque_anterior,
        estoque_atual,
        motivo,
        matricula_responsavel,
        requisicao_id,
        created_at,
        item:itens_almoxarifado!inner(
          id,
          nome,
          categoria,
          imagem_url
        ),
        responsavel:usuarios!movimentacoes_estoque_matricula_responsavel_fkey(
          nome,
          matricula
        ),
        requisicao:requisicoes(
          id,
          solicitante:usuarios!requisicoes_matricula_solicitante_fkey(
            nome,
            matricula
          )
        )
      `)

    // Aplicar filtros de permissão
    if (!canViewAll) {
      // Usuários comuns só podem ver movimentações que eles fizeram
      query = query.eq('matricula_responsavel', usuario.matricula)
    }

    // Aplicar filtros de busca
    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    if (dataInicio) {
      query = query.gte('created_at', `${dataInicio}T00:00:00`)
    }

    if (dataFim) {
      query = query.lte('created_at', `${dataFim}T23:59:59`)
    }

    // Busca por texto (nome do item ou responsável)
    if (search) {
      // Para busca por texto, precisamos fazer uma query mais complexa
      
      // Primeiro, buscar itens que correspondem ao termo de busca
      const { data: matchingItems } = await supabase
        .from('itens_almoxarifado')
        .select('id')
        .ilike('nome', `%${search}%`)

      const itemIds = matchingItems?.map(item => item.id) || []

      // Buscar usuários que correspondem ao termo de busca
      const { data: matchingUsers } = await supabase
        .from('usuarios')
        .select('matricula')
        .ilike('nome', `%${search}%`)

      const userMatriculas = matchingUsers?.map(user => user.matricula) || []

      // Aplicar filtro OR para itens ou usuários
      if (itemIds.length > 0 || userMatriculas.length > 0) {
        const filters = []
        if (itemIds.length > 0) {
          filters.push(`item_id.in.(${itemIds.join(',')})`)
        }
        if (userMatriculas.length > 0) {
          filters.push(`matricula_responsavel.in.(${userMatriculas.join(',')})`)
        }
        query = query.or(filters.join(','))
      } else {
        // Se não encontrou correspondências, retornar vazio
        return NextResponse.json({
          movimentacoes: [],
          total: 0,
          page,
          totalPages: 0
        })
      }
    }

    // Contar total de registros
    const countQuery = supabase
      .from('movimentacoes_estoque')
      .select('*', { count: 'exact', head: true })

    // Aplicar os mesmos filtros para contagem
    if (!canViewAll) {
      countQuery.eq('matricula_responsavel', usuario.matricula)
    }

    if (tipo) {
      countQuery.eq('tipo', tipo)
    }

    if (itemId) {
      countQuery.eq('item_id', itemId)
    }

    if (dataInicio) {
      countQuery.gte('created_at', `${dataInicio}T00:00:00`)
    }

    if (dataFim) {
      countQuery.lte('created_at', `${dataFim}T23:59:59`)
    }

    if (search) {
      
      const { data: matchingItems } = await supabase
        .from('itens_almoxarifado')
        .select('id')
        .ilike('nome', `%${search}%`)

      const itemIds = matchingItems?.map(item => item.id) || []

      const { data: matchingUsers } = await supabase
        .from('usuarios')
        .select('matricula')
        .ilike('nome', `%${search}%`)

      const userMatriculas = matchingUsers?.map(user => user.matricula) || []

      if (itemIds.length > 0 || userMatriculas.length > 0) {
        const filters = []
        if (itemIds.length > 0) {
          filters.push(`item_id.in.(${itemIds.join(',')})`)
        }
        if (userMatriculas.length > 0) {
          filters.push(`matricula_responsavel.in.(${userMatriculas.join(',')})`)
        }
        countQuery.or(filters.join(','))
      }
    }

    const { count } = await countQuery

    // Buscar dados com paginação
    const { data: movimentacoes, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Erro ao buscar movimentações:', error)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      movimentacoes: movimentacoes || [],
      total: count || 0,
      page,
      totalPages
    })

  } catch (error) {
    console.error('Erro na API de movimentações:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/almoxarifado/movimentacoes - Registrar movimento de entrada
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    let decoded: jwt.JwtPayload | string

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar se o usuário existe
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('matricula, funcao')
      .eq('matricula', (decoded as jwt.JwtPayload).matricula)
      .single()

    if (!usuario) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Obter dados do corpo da requisição
    const body = await request.json()
    const { item_id, quantidade, motivo } = body

    // Validar campos obrigatórios
    if (!item_id) {
      return NextResponse.json({ error: 'ID do item é obrigatório' }, { status: 400 })
    }

    if (!quantidade || quantidade <= 0) {
      return NextResponse.json({ 
        error: 'Quantidade deve ser maior que zero' 
      }, { status: 400 })
    }

    if (!motivo || motivo.trim() === '') {
      return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 })
    }

    // Buscar item atual para obter estoque anterior
    const { data: item, error: itemError } = await supabase
      .from('itens_almoxarifado')
      .select('id, nome, estoque_atual, ativo')
      .eq('id', item_id)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    if (!item.ativo) {
      return NextResponse.json({ error: 'Item não está ativo' }, { status: 400 })
    }

    const estoqueAnterior = item.estoque_atual
    const estoqueAtual = estoqueAnterior + parseInt(quantidade)

    // Registrar movimento de entrada
    const { data: movimento, error: movimentoError } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        item_id,
        tipo: 'entrada',
        quantidade: parseInt(quantidade),
        estoque_anterior: estoqueAnterior,
        estoque_atual: estoqueAtual,
        motivo: motivo.trim(),
        matricula_responsavel: usuario.matricula
      })
      .select(`
        id,
        item_id,
        tipo,
        quantidade,
        estoque_anterior,
        estoque_atual,
        motivo,
        matricula_responsavel,
        created_at,
        itens_almoxarifado:item_id (
          nome,
          categoria
        ),
        usuarios:matricula_responsavel (
          nome
        )
      `)
      .single()

    if (movimentoError) {
      console.error('Erro ao registrar movimento:', movimentoError)
      return NextResponse.json({ 
        error: 'Erro ao registrar movimento de entrada' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Movimento de entrada registrado com sucesso',
      movimento
    })

  } catch (error) {
    console.error('Erro na API de movimentações POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}