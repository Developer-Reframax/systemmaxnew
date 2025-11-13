import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase com Service Role Key para bypass do RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// GET /api/apadrinhamento/stats - Estatísticas para dashboard
export async function GET() {
  try {
    // Buscar estatísticas gerais
    const { data: stats, error: statsError } = await supabase
      .from('apadrinhamentos')
      .select('status, tipo_apadrinhamento, data_fim')

    if (statsError) {
      console.error('Erro ao buscar estatísticas:', statsError)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    // Calcular estatísticas
    const total_ativos = stats?.filter(a => a.status === 'Ativo').length || 0
    const total_concluidos = stats?.filter(a => a.status === 'Concluído').length || 0
    const total_vencidos = stats?.filter(a => a.status === 'Vencido').length || 0

    // Calcular próximos ao vencimento (próximos 7 dias)
    const hoje = new Date()
    const proximosSete = new Date()
    proximosSete.setDate(hoje.getDate() + 7)

    const proximos_vencimento = stats?.filter(a => {
      if (a.status !== 'Ativo') return false
      const dataFim = new Date(a.data_fim)
      return dataFim >= hoje && dataFim <= proximosSete
    }).length || 0

    // Estatísticas por tipo
    const por_tipo = {
      'Novo Colaborador': stats?.filter(a => a.tipo_apadrinhamento === 'Novo Colaborador' && a.status === 'Ativo').length || 0,
      'Novo Operador de Ponte': stats?.filter(a => a.tipo_apadrinhamento === 'Novo Operador de Ponte' && a.status === 'Ativo').length || 0,
      'Novo Operador de Empilhadeira': stats?.filter(a => a.tipo_apadrinhamento === 'Novo Operador de Empilhadeira' && a.status === 'Ativo').length || 0
    }

    return NextResponse.json({
      total_ativos,
      total_concluidos,
      total_vencidos,
      proximos_vencimento,
      por_tipo
    })

  } catch (error) {
    console.error('Erro na API de estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
