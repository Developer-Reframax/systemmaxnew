import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Listar alertas
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // ativo, em_tratamento, resolvido
    const all = searchParams.get('all') === 'true' // Para buscar todos os alertas sem paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = all ? 1000 : parseInt(searchParams.get('limit') || '10') // Limite maior quando all=true
    const offset = (page - 1) * limit

    // Verificar permissões - apenas líderes, supervisores e admins podem ver alertas
    const { data: userData } = await supabase
      .from('usuarios')
      .select('role, equipe_id, letra_id')
      .eq('matricula', authResult.user?.matricula)
      .single()

    if (!userData || !['Lider', 'Supervisor', 'Admin', 'Editor'].includes(userData.role)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado. Apenas líderes e supervisores podem visualizar alertas.' },
        { status: 403 }
      )
    }

    let query = supabase
      .from('alertas_emociograma')
      .select(`
        *
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    let countQuery = supabase
      .from('alertas_emociograma')
      .select('*', { count: 'exact', head: true })

    // Filtrar por status se fornecido
    if (status) {
      const statusArray = status.split(',')
      query = query.in('status', statusArray)
      countQuery = countQuery.in('status', statusArray)
    }

    // Para líderes e supervisores, sempre filtrar por equipe/letra
    // Para admins/editores, só aplicar filtro se all=false
    if (['Lider', 'Supervisor'].includes(userData.role) || (!all && ['Admin', 'Editor'].includes(userData.role))) {
      let matriculasPermitidas: number[] = []
      
      if (userData.equipe_id) {
        const { data: equipeUsers } = await supabase
          .from('usuarios')
          .select('matricula')
          .eq('equipe_id', userData.equipe_id)
        
        if (equipeUsers) {
          matriculasPermitidas = [...matriculasPermitidas, ...equipeUsers.map(u => u.matricula)]
        }
      }
      
      if (userData.letra_id) {
        const { data: letraUsers } = await supabase
          .from('usuarios')
          .select('matricula')
          .eq('letra_id', userData.letra_id)
        
        if (letraUsers) {
          matriculasPermitidas = [...matriculasPermitidas, ...letraUsers.map(u => u.matricula)]
        }
      }

      if (matriculasPermitidas.length > 0) {
        query = query.in('usuario_matricula', matriculasPermitidas)
        countQuery = countQuery.in('usuario_matricula', matriculasPermitidas)
      } else {
        // Se não tem usuários permitidos, retorna vazio
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        })
      }
    }

    const [{ data: alertas, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ])

    if (error || countError) {
      console.error('Erro ao buscar alertas:', error || countError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar alertas' },
        { status: 500 }
      )
    }

    // Transformar os dados para incluir o objeto usuario
    const alertasComUsuario = alertas?.map(alerta => ({
      ...alerta,
      usuario: {
        matricula: alerta.usuario_matricula,
        nome: alerta.usuario_nome,
        email: '' // Não temos email na tabela alertas_emociograma
      }
    })) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: alertasComUsuario,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })

  } catch (error) {
    console.error('Alertas GET API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
