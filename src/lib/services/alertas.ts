import { supabase } from '@/lib/supabase'

export interface AlertaEmociograma {
  id: string
  usuario_matricula: number
  usuario_nome: string
  equipe?: string
  letra?: string
  estado_emocional: 'regular' | 'pessimo'
  observacoes?: string
  data_registro: string
  lider_matricula?: number
  supervisor_matricula?: number
  notificado: boolean
  created_at: string
}

export interface NotificacaoAlerta {
  destinatario_matricula: number
  destinatario_nome: string
  destinatario_email?: string
  tipo: 'lider' | 'supervisor'
  usuario_afetado: string
  estado_emocional: string
  data_registro: string
  observacoes?: string
}

/**
 * Cria alertas automáticos para estados emocionais irregulares
 */
export async function criarAlertaEmociograma(
  usuarioMatricula: number,
  estadoEmocional: 'regular' | 'pessimo',
  observacoes?: string
): Promise<void> {
  try {
    // Buscar informações do usuário com suas relações
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select(`
        nome,
        letra_id,
        equipe_id,
        letras!usuarios_letra_id_fkey(letra),
        equipes!usuarios_equipe_id_fkey(equipe)
      `)
      .eq('matricula', usuarioMatricula)
      .single()

    if (userError || !usuario) {
      console.error('Erro ao buscar usuário para alerta:', userError)
      return
    }

    const equipe = usuario.equipes?.[0]?.equipe
    const letra = usuario.letras?.[0]?.letra

    // Buscar líderes e supervisores responsáveis
    const responsaveis = await buscarResponsaveis(equipe, letra)

    // Criar registro de alerta
    const { error: alertError } = await supabase
      .from('alertas_emociograma')
      .insert({
        usuario_matricula: usuarioMatricula,
        usuario_nome: usuario.nome,
        equipe: equipe,
        letra: letra,
        estado_emocional: estadoEmocional,
        observacoes,
        data_registro: new Date().toISOString(),
        lider_matricula: responsaveis.lider?.matricula,
        supervisor_matricula: responsaveis.supervisor?.matricula,
        notificado: false
      })

    if (alertError) {
      console.error('Erro ao criar alerta:', alertError)
      return
    }

    // Enviar notificações
    await enviarNotificacoes({
      usuario_afetado: usuario.nome,
      estado_emocional: estadoEmocional,
      observacoes,
      responsaveis
    })

  } catch (error) {
    console.error('Erro ao processar alerta de emociograma:', error)
  }
}

/**
 * Busca líderes e supervisores responsáveis pela equipe/letra do usuário
 */
async function buscarResponsaveis(equipe?: string, letra?: string) {
  const responsaveis: {
    lider?: { matricula: number; nome: string; email?: string }
    supervisor?: { matricula: number; nome: string; email?: string }
  } = {}

  try {
    // Buscar líder da letra (se houver)
    if (letra) {
      const { data: lider } = await supabase
        .from('letras')
        .select(`
          lider,
          usuarios!letras_lider_fkey(matricula, nome, email)
        `)
        .eq('letra', letra)
        .not('lider', 'is', null)
        .single()

      if (lider?.usuarios?.[0]) {
        responsaveis.lider = {
          matricula: lider.usuarios[0].matricula,
          nome: lider.usuarios[0].nome,
          email: lider.usuarios[0].email
        }
      }
    }

    // Buscar supervisor da equipe (se houver)
    if (equipe) {
      const { data: supervisor } = await supabase
        .from('equipes')
        .select(`
          supervisor,
          usuarios!equipes_supervisor_fkey(matricula, nome, email)
        `)
        .eq('equipe', equipe)
        .not('supervisor', 'is', null)
        .single()

      if (supervisor?.usuarios?.[0]) {
        responsaveis.supervisor = {
          matricula: supervisor.usuarios[0].matricula,
          nome: supervisor.usuarios[0].nome,
          email: supervisor.usuarios[0].email
        }
      }
    }

    // Se não encontrou líder específico, buscar por função geral
    if (!responsaveis.lider) {
      const { data: liderGeral } = await supabase
        .from('usuarios')
        .select('matricula, nome, email')
        .or(`role.eq.Admin,role.eq.Editor`)
        .eq('status', 'ativo')
        .limit(1)
        .single()

      if (liderGeral) {
        responsaveis.lider = liderGeral
      }
    }

  } catch (error) {
    console.error('Erro ao buscar responsáveis:', error)
  }

  return responsaveis
}

/**
 * Envia notificações para os responsáveis
 */
async function enviarNotificacoes({
  usuario_afetado,
  estado_emocional,
  observacoes,
  responsaveis
}: {
  usuario_afetado: string
  estado_emocional: string
  observacoes?: string
  responsaveis: {
    lider?: { matricula: number; nome: string; email?: string }
    supervisor?: { matricula: number; nome: string; email?: string }
  }
}) {
  const notificacoes: NotificacaoAlerta[] = []

  // Preparar notificação para líder
  if (responsaveis.lider) {
    notificacoes.push({
      destinatario_matricula: responsaveis.lider.matricula,
      destinatario_nome: responsaveis.lider.nome,
      destinatario_email: responsaveis.lider.email,
      tipo: 'lider',
      usuario_afetado,
      estado_emocional,
      data_registro: new Date().toISOString(),
      observacoes
    })
  }

  // Preparar notificação para supervisor
  if (responsaveis.supervisor && responsaveis.supervisor.matricula !== responsaveis.lider?.matricula) {
    notificacoes.push({
      destinatario_matricula: responsaveis.supervisor.matricula,
      destinatario_nome: responsaveis.supervisor.nome,
      destinatario_email: responsaveis.supervisor.email,
      tipo: 'supervisor',
      usuario_afetado,
      estado_emocional,
      data_registro: new Date().toISOString(),
      observacoes
    })
  }

  // Processar notificações
  for (const notificacao of notificacoes) {
    await processarNotificacao(notificacao)
  }
}

/**
 * Processa uma notificação individual
 */
async function processarNotificacao(notificacao: NotificacaoAlerta) {
  try {
    // Registrar notificação no banco
    const { error } = await supabase
      .from('notificacoes_emociograma')
      .insert({
        destinatario_matricula: notificacao.destinatario_matricula,
        tipo: notificacao.tipo,
        usuario_afetado: notificacao.usuario_afetado,
        estado_emocional: notificacao.estado_emocional,
        data_registro: notificacao.data_registro,
        observacoes: notificacao.observacoes,
        lida: false,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Erro ao registrar notificação:', error)
    }

    // Aqui você pode implementar outros canais de notificação:
    // - Email
    // - SMS
    // - Push notifications
    // - Integração com Teams/Slack
    
    console.log(`Notificação enviada para ${notificacao.destinatario_nome} (${notificacao.tipo})`)

  } catch (error) {
    console.error('Erro ao processar notificação:', error)
  }
}

/**
 * Busca alertas ativos para um usuário específico
 */
export async function buscarAlertasAtivos(usuarioMatricula?: number): Promise<AlertaEmociograma[]> {
  try {
    let query = supabase
      .from('alertas_emociograma')
      .select('*')
      .eq('notificado', true)
      .order('created_at', { ascending: false })

    if (usuarioMatricula) {
      query = query.eq('usuario_matricula', usuarioMatricula)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar alertas:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro ao buscar alertas ativos:', error)
    return []
  }
}

/**
 * Marca alertas como resolvidos
 */
export async function resolverAlerta(alertaId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('alertas_emociograma')
      .update({ resolvido: true, data_resolucao: new Date().toISOString() })
      .eq('id', alertaId)

    if (error) {
      console.error('Erro ao resolver alerta:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao resolver alerta:', error)
    return false
  }
}

/**
 * Valida hierarquia organizacional para tratativas
 */
export async function validarHierarquiaParaTratativa(
  usuarioSolicitante: number,
  usuarioAlvo: number
): Promise<{ autorizado: boolean; motivo?: string }> {
  try {
    // Buscar informações dos usuários com suas relações
    const [solicitante, alvo] = await Promise.all([
      supabase.from('usuarios').select(`
        *,
        letras!usuarios_letra_id_fkey(letra),
        equipes!usuarios_equipe_id_fkey(equipe)
      `).eq('matricula', usuarioSolicitante).single(),
      supabase.from('usuarios').select(`
        *,
        letras!usuarios_letra_id_fkey(letra),
        equipes!usuarios_equipe_id_fkey(equipe)
      `).eq('matricula', usuarioAlvo).single()
    ])

    if (!solicitante.data || !alvo.data) {
      return { autorizado: false, motivo: 'Usuário não encontrado' }
    }

    // Admin e Editor podem gerenciar qualquer tratativa
    if (['Admin', 'Editor'].includes(solicitante.data.role)) {
      return { autorizado: true }
    }

    // Líder pode gerenciar tratativas da sua letra
    if (solicitante.data.funcao?.includes('Líder')) {
      const solicitanteLetra = solicitante.data.letras?.letra
      const alvoLetra = alvo.data.letras?.letra
      
      if (solicitanteLetra && solicitanteLetra === alvoLetra) {
        return { autorizado: true }
      }
      return { autorizado: false, motivo: 'Líder só pode gerenciar tratativas da sua letra' }
    }

    // Supervisor pode gerenciar tratativas da sua equipe
    if (solicitante.data.funcao?.includes('Supervisor')) {
      const solicitanteEquipe = solicitante.data.equipes?.equipe
      const alvoEquipe = alvo.data.equipes?.equipe
      
      if (solicitanteEquipe && solicitanteEquipe === alvoEquipe) {
        return { autorizado: true }
      }
      return { autorizado: false, motivo: 'Supervisor só pode gerenciar tratativas da sua equipe' }
    }

    return { autorizado: false, motivo: 'Usuário não possui permissão para gerenciar tratativas' }

  } catch (error) {
    console.error('Erro ao validar hierarquia:', error)
    return { autorizado: false, motivo: 'Erro interno do sistema' }
  }
}

/**
 * Busca estatísticas de alertas para dashboard
 */
export async function buscarEstatisticasAlertas(periodo: '7d' | '30d' | '90d' = '30d') {
  try {
    const dataInicio = new Date()
    const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
    dataInicio.setDate(dataInicio.getDate() - dias)

    const { data, error } = await supabase
      .from('alertas_emociograma')
      .select('estado_emocional, created_at, resolvido')
      .gte('created_at', dataInicio.toISOString())

    if (error) {
      console.error('Erro ao buscar estatísticas de alertas:', error)
      return {
        totalAlertas: 0,
        alertasRegular: 0,
        alertasPessimo: 0,
        alertasResolvidos: 0,
        alertasPendentes: 0
      }
    }

    const stats = {
      totalAlertas: data.length,
      alertasRegular: data.filter(a => a.estado_emocional === 'regular').length,
      alertasPessimo: data.filter(a => a.estado_emocional === 'pessimo').length,
      alertasResolvidos: data.filter(a => a.resolvido).length,
      alertasPendentes: data.filter(a => !a.resolvido).length
    }

    return stats
  } catch (error) {
    console.error('Erro ao buscar estatísticas de alertas:', error)
    return {
      totalAlertas: 0,
      alertasRegular: 0,
      alertasPessimo: 0,
      alertasResolvidos: 0,
      alertasPendentes: 0
    }
  }
}
