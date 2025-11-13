import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Obter configurações
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
    const contrato = searchParams.get('contrato')

    if (!contrato) {
      return NextResponse.json(
        { success: false, message: 'Contrato é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar configurações do contrato
    const { data: config, error } = await supabase
      .from('configuracoes_desvios')
      .select('*')
      .eq('contrato', contrato)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao buscar configurações:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar configurações' },
        { status: 500 }
      )
    }

    // Se não existe configuração, retornar configuração padrão
    if (!config) {
      const configPadrao = {
        contrato,
        prazo_padrao_dias: 30,
        obrigar_natureza: true,
        obrigar_tipo: true,
        obrigar_risco: true,
        obrigar_equipe: true,
        obrigar_imagem_antes: true,
        obrigar_imagem_durante: false,
        obrigar_imagem_depois: false,
        max_imagens_categoria: 5,
        notificar_vencimento_dias: 3,
        auto_vencer_apos_dias: null,
        permitir_edicao_apos_avaliacao: false
      }

      return NextResponse.json({
        success: true,
        data: configPadrao,
        is_default: true
      })
    }

    return NextResponse.json({
      success: true,
      data: config,
      is_default: false
    })

  } catch (error) {
    console.error('Get configurações API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST/PUT - Salvar configurações
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário tem permissão (apenas Admin)
    if (!authResult.user || authResult.user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas Admin pode alterar configurações' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      contrato,
      prazo_padrao_dias,
      obrigar_natureza,
      obrigar_tipo,
      obrigar_risco,
      obrigar_equipe,
      obrigar_imagem_antes,
      obrigar_imagem_durante,
      obrigar_imagem_depois,
      max_imagens_categoria,
      notificar_vencimento_dias,
      auto_vencer_apos_dias,
      permitir_edicao_apos_avaliacao
    } = body

    // Validar campos obrigatórios
    if (!contrato) {
      return NextResponse.json(
        { success: false, message: 'Contrato é obrigatório' },
        { status: 400 }
      )
    }

    // Validar valores numéricos
    if (prazo_padrao_dias && (prazo_padrao_dias < 1 || prazo_padrao_dias > 365)) {
      return NextResponse.json(
        { success: false, message: 'Prazo padrão deve estar entre 1 e 365 dias' },
        { status: 400 }
      )
    }

    if (max_imagens_categoria && (max_imagens_categoria < 1 || max_imagens_categoria > 10)) {
      return NextResponse.json(
        { success: false, message: 'Máximo de imagens por categoria deve estar entre 1 e 10' },
        { status: 400 }
      )
    }

    if (notificar_vencimento_dias && (notificar_vencimento_dias < 1 || notificar_vencimento_dias > 30)) {
      return NextResponse.json(
        { success: false, message: 'Notificação de vencimento deve estar entre 1 e 30 dias' },
        { status: 400 }
      )
    }

    if (auto_vencer_apos_dias && (auto_vencer_apos_dias < 1 || auto_vencer_apos_dias > 365)) {
      return NextResponse.json(
        { success: false, message: 'Auto vencimento deve estar entre 1 e 365 dias' },
        { status: 400 }
      )
    }

    // Preparar dados para inserção/atualização
    const configData = {
      contrato,
      prazo_padrao_dias: prazo_padrao_dias || 30,
      obrigar_natureza: obrigar_natureza !== false,
      obrigar_tipo: obrigar_tipo !== false,
      obrigar_risco: obrigar_risco !== false,
      obrigar_equipe: obrigar_equipe !== false,
      obrigar_imagem_antes: obrigar_imagem_antes !== false,
      obrigar_imagem_durante: obrigar_imagem_durante === true,
      obrigar_imagem_depois: obrigar_imagem_depois === true,
      max_imagens_categoria: max_imagens_categoria || 5,
      notificar_vencimento_dias: notificar_vencimento_dias || 3,
      auto_vencer_apos_dias: auto_vencer_apos_dias || null,
      permitir_edicao_apos_avaliacao: permitir_edicao_apos_avaliacao === true,
      updated_at: new Date().toISOString()
    }

    // Verificar se já existe configuração para o contrato
    const { data: existingConfig } = await supabase
      .from('configuracoes_desvios')
      .select('id')
      .eq('contrato', contrato)
      .single()

    let result
    if (existingConfig) {
      // Atualizar configuração existente
      result = await supabase
        .from('configuracoes_desvios')
        .update(configData)
        .eq('contrato', contrato)
        .select()
        .single()
    } else {
      // Criar nova configuração
      result = await supabase
        .from('configuracoes_desvios')
        .insert({ ...configData, created_at: new Date().toISOString() })
        .select()
        .single()
    }

    if (result.error) {
      console.error('Erro ao salvar configurações:', result.error)
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar configurações' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: existingConfig ? 'Configurações atualizadas com sucesso' : 'Configurações criadas com sucesso',
      data: result.data
    })

  } catch (error) {
    console.error('Salvar configurações API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Alias para POST (para compatibilidade)
export async function PUT(request: NextRequest) {
  return POST(request)
}

// DELETE - Remover configurações (volta ao padrão)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status }
      )
    }

    // Verificar se o usuário tem permissão (apenas Admin)
    if (!authResult.user || authResult.user.role !== 'Admin') {
      return NextResponse.json(
        { success: false, message: 'Acesso negado - apenas Admin pode remover configurações' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contrato = searchParams.get('contrato')

    if (!contrato) {
      return NextResponse.json(
        { success: false, message: 'Contrato é obrigatório' },
        { status: 400 }
      )
    }

    // Remover configurações do contrato
    const { error } = await supabase
      .from('configuracoes_desvios')
      .delete()
      .eq('contrato', contrato)

    if (error) {
      console.error('Erro ao remover configurações:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao remover configurações' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações removidas com sucesso - voltando ao padrão'
    })

  } catch (error) {
    console.error('Remover configurações API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
