'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Brain, Sparkles } from 'lucide-react'

interface Step {
  title: string
  content: string[]
}

const steps: Step[] = [
  {
    title: '🧠 Metodologia do Teste de Prontidão Cognitiva – Systemmax',
    content: [
      'Avaliação rápida, objetiva e cientificamente fundamentada da capacidade cognitiva para atividades críticas',
      'O Teste de Prontidão Cognitiva do Systemmax foi desenvolvido como uma ferramenta de avaliação rápida e não invasiva, destinada a apoiar a tomada de decisão em atividades que exigem alta concentração, atenção sustentada, tempo de reação adequado e controle inibitório. A metodologia adotada combina princípios de neurociência cognitiva, psicometria aplicada, ergonomia e gestão moderna de riscos ocupacionais.'
    ]
  },
  {
    title: 'Fundamentação Metodológica',
    content: [
      'O Systemmax utiliza uma combinação de dois testes amplamente reconhecidos em estudos de psicologia cognitiva e segurança operacional:',
      '1️⃣ Teste de Atenção Sustentada (Go/No-Go)',
      'Baseado em protocolos internacionais de vigilância cognitiva, o teste avalia:',
      'tempo de reação a estímulos relevantes',
      'erros de omissão (falha em responder)',
      'erros de comissão (responder quando não deveria)',
      'variações de desempenho ao longo do tempo (fading ou fadiga cognitiva)',
      'Este método é tradicionalmente utilizado em setores como aviação, transporte, mineração, controle de tráfego e operações industriais críticas.',
      '2️⃣ Teste de Conflito Cognitivo (Stroop Simplificado)',
      'Inspirado no clássico Teste de Stroop, amplamente validado na literatura científica, ele mede:',
      'atenção seletiva',
      'controle inibitório',
      'capacidade de tomar decisões sob conflito',
      'interferência cognitiva causada por cansaço, ansiedade ou dispersão',
      'Esse teste é sensível a alterações no estado emocional, fadiga, estresse e sobrecarga mental.'
    ]
  },
  {
    title: 'Por que essa combinação foi escolhida',
    content: [
      'A união dos dois métodos cria uma avaliação completa e equilibrada, pois cada teste mede um componente cognitivo distinto:',
      '✦ O Go/No-Go mede:',
      'vigilância contínua',
      'prontidão motora',
      'estabilidade da atenção',
      'capacidade de manter foco por um período curto',
      'sonolência leve a moderada',
      'impulsividade comportamental',
      '✦ O Stroop mede:',
      'tomada de decisão sob interferência',
      'atenção seletiva',
      'impacto emocional e cognitivo no julgamento',
      'fadiga mais profunda e desorganização mental',
      'controle executivo',
      'A combinação fornece uma visão multidimensional da aptidão mental para atividades críticas, permitindo identificar risco real, e não apenas desempenho momentâneo.'
    ]
  },
  {
    title: 'Benefícios diretos da metodologia',
    content: [
      'A implementação desse teste proporciona ganhos significativos para a organização:',
      '✔ Redução de riscos operacionais',
      'Detecta precocemente condições que poderiam resultar em falhas humanas em atividades sensíveis.',
      '✔ Suporte à tomada de decisão da liderança',
      'Fornece indicadores objetivos que complementam a percepção do gestor e do próprio colaborador.',
      '✔ Monitoramento contínuo do estado cognitivo da equipe',
      'A análise histórica permite identificar padrões como:',
      'crescimento de fadiga ao longo de turnos',
      'picos de sonolência em horários específicos',
      'impacto de mudanças de escala',
      'efeitos de sobrecarga emocional',
      '✔ Prevenção de acidentes',
      'A ferramenta se alinha ao PGR e ao PCMSO, atuando como medida preventiva adicional.',
      '✔ Rastro digital de segurança e conformidade',
      'Todos os registros ficam consolidados no Systemmax:',
      'sessão realizada',
      'indicadores gerados',
      'desvios abertos',
      'tratativas concluídas',
      'Isso fortalece auditorias internas, externas e certificações de sistemas de gestão (ISO 45001, por exemplo).',
      '✔ Avaliação justa, não subjetiva',
      'O teste elimina vieses humanos ao analisar prontidão, garantindo mais equidade na operação.'
    ]
  },
  {
    title: 'Dados extraídos pelo Systemmax',
    content: [
      'A metodologia permite extrair métricas detalhadas e altamente sensíveis a variações cognitivas:',
      'Dados fundamentais',
      'Tempo médio de reação',
      'Taxa de erros de omissão',
      'Taxa de erros de comissão',
      'Taxa de erros de conflito (Stroop)',
      'Perfis de desempenho ao longo do teste',
      'Variação temporal → Índice de Fadiga Cognitiva',
      'Indicadores consolidados',
      'Readiness Score (0–100)',
      'Pontuação final normalizada que representa a aptidão cognitiva.',
      'Classificação de Risco',
      'APTO',
      'EM ALERTA',
      'ALTO RISCO',
      'Cadastro de Desvios Automático',
      'Em casos de alto risco, o Systemmax:',
      'Gera um desvio automaticamente',
      'Registra motivos técnicos',
      'Dispara fluxo de tratativa',
      'Registra responsáveis, ações e prazos'
    ]
  },
  {
    title: 'Por que essa metodologia é segura e juridicamente adequada',
    content: [
      'A escolha deste método respeita:',
      '✔ LGPD – com mínima coleta de dados sensíveis',
      'Somente métricas cognitivas necessárias são armazenadas.',
      '✔ NR-1 e PGR – Gestão de riscos',
      'O teste se enquadra como medida preventiva operacional.',
      '✔ NR-7 – Complementar ao PCMSO, não substitutivo',
      'O teste não é diagnóstico médico, mas um indicador operacional.',
      '✔ Princípio da não discriminação',
      'A ferramenta não pune nem expõe o trabalhador.',
      'Ela previne riscos e direciona tratativas com transparência.'
    ]
  },
  {
    title: 'Resumo dos benefícios organizacionais',
    content: [
      'Redução efetiva de acidentes por falha humana',
      'Indicador objetivo para tomada de decisão',
      'Melhoria na saúde e segurança ocupacional',
      'Aumento da percepção de cuidado com o colaborador',
      'Gestão ativa da fadiga no processo produtivo',
      'Ferramenta alinhada às melhores práticas internacionais',
      'Rastreabilidade total das ações corretivas e preventivas'
    ]
  },
  {
    title: 'Conclusão: uma ferramenta moderna, preventiva e humana',
    content: [
      'A metodologia escolhida para o Teste de Prontidão Cognitiva combina ciência, tecnologia e responsabilidade organizacional.',
      'Ela foi pensada para proteger vidas, reduzir riscos operacionais e oferecer aos colaboradores um ambiente mais seguro, com decisões pautadas em dados reais e avaliações justas.',
      'O resultado final é uma solução:',
      'rápida,',
      'eficiente,',
      'precisa,',
      'não invasiva,',
      'altamente preventiva,',
      'completa para operações críticas.'
    ]
  }
]

export default function ProntidaoApresentacaoPage() {
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex])

  const next = () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  const prev = () => setStepIndex((prev) => Math.max(prev - 1, 0))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8 relative">
        <div className="absolute -top-16 -left-10 h-48 w-48 bg-blue-500/15 blur-3xl rounded-full" />
        <div className="absolute top-10 right-0 h-64 w-64 bg-purple-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 left-12 h-44 w-44 bg-emerald-500/10 blur-3xl rounded-full" />

        <div className="flex items-center justify-between flex-wrap gap-4 relative">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-300 uppercase tracking-[0.18em]">Systemmax</p>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight bg-gradient-to-r from-blue-200 via-white to-indigo-300 bg-clip-text text-transparent">
                Apresentação do Módulo de Prontidão Cognitiva
              </h1>
              <p className="text-slate-200">Narrativa completa da metodologia e fundamentos.</p>
            </div>
          </div>
          <Link
            href="/prontidao"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/15 transition-colors text-sm font-semibold"
          >
            Voltar ao módulo
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-blue-500/10" />
          <div className="relative flex items-start justify-between flex-wrap gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Etapa {stepIndex + 1} / {steps.length}</p>
              <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-200 via-white to-purple-200 bg-clip-text text-transparent">
                <Sparkles className="h-5 w-5 text-blue-200 animate-pulse" />
                {step.title}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Progresso</p>
              <p className="text-lg font-semibold">{progress}%</p>
            </div>
          </div>

          <div className="relative space-y-3">
            {step.content.map((paragraph, idx) => (
              <div
                key={`${stepIndex}-${idx}-${paragraph.slice(0, 10)}`}
                className="transform transition-all duration-500 ease-out animate-fade-in-up"
              >
                <p className="text-base leading-relaxed text-slate-100">{paragraph}</p>
              </div>
            ))}
          </div>

          <div className="relative flex items-center justify-between pt-4 border-t border-white/10">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="inline-flex items-center px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
            <div className="flex-1 mx-6 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 animate-pulse" style={{ width: `${progress}%` }} />
            </div>
            <button
              onClick={next}
              disabled={stepIndex === steps.length - 1}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Avançar
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
