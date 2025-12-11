'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Activity, Brain, Play, StopCircle, Home } from 'lucide-react'
import Link from 'next/link'
import type { ReadinessEventInput, ReadinessRiskLevel } from '@/lib/types/readiness'

type TestPhase = 'idle' | 'block1' | 'block2' | 'finished'

const GO_NO_GO_DURATION = 30_000
const STROOP_DURATION = 30_000
const GO_NO_GO_WINDOW = 1_200
const STROOP_WINDOW = 2_500

interface GoNoGoStimulus {
  id: number
  color: 'VERDE' | 'VERMELHO'
  expected: 'CLICAR' | 'NAO_CLICAR'
  shownAt: number
}

interface StroopStimulus {
  id: number
  word: string
  colorName: 'VERDE' | 'VERMELHO' | 'AZUL' | 'AMARELO'
  colorHex: string
  shownAt: number
}

const stroopColors: Record<StroopStimulus['colorName'], string> = {
  VERDE: '#16a34a',
  VERMELHO: '#dc2626',
  AZUL: '#2563eb',
  AMARELO: '#eab308'
}

export default function ProntidaoTestePage() {
  const { user } = useAuth()
  const [matricula, setMatricula] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [, setEvents] = useState<ReadinessEventInput[]>([])
  const [result, setResult] = useState<{ readiness_score: number; risk_level: ReadinessRiskLevel } | null>(null)
  const [loading, setLoading] = useState(false)
  const [goNoGoStimulus, setGoNoGoStimulus] = useState<GoNoGoStimulus | null>(null)
  const [stroopStimulus, setStroopStimulus] = useState<StroopStimulus | null>(null)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Clique em iniciar para começar o teste.')

  const goNoGoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const goNoGoStimulusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const goNoGoBlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stroopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stroopRunnerRef = useRef<(() => void) | null>(null)
  const blockStartRef = useRef<number>(0)
  const sessionIdRef = useRef<string>('')
  const eventsRef = useRef<ReadinessEventInput[]>([])

  useEffect(() => {
    if (user?.matricula) {
      setMatricula(String(user.matricula))
    }
  }, [user])

  useEffect(() => () => cleanupTimers(), [])

  const cleanupTimers = () => {
    if (goNoGoIntervalRef.current) clearInterval(goNoGoIntervalRef.current)
    if (goNoGoStimulusTimeoutRef.current) clearTimeout(goNoGoStimulusTimeoutRef.current)
    if (goNoGoBlockTimeoutRef.current) clearTimeout(goNoGoBlockTimeoutRef.current)
    if (stroopTimeoutRef.current) clearTimeout(stroopTimeoutRef.current)
    goNoGoIntervalRef.current = null
    goNoGoStimulusTimeoutRef.current = null
    goNoGoBlockTimeoutRef.current = null
    stroopTimeoutRef.current = null
  }

  const startSession = async () => {
    if (!matricula) {
      toast.error('Matrícula do usuário não encontrada.')
      return
    }

    try {
      setLoading(true)
      setEvents([])
      eventsRef.current = []
      setResult(null)
      setMessage('Preparando o teste...')
      const response = await fetch('/api/prontidao/sessions', {
        method: 'POST',
        body: JSON.stringify({ matricula })
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Não foi possível iniciar a sessão')
      }

      setSessionId(payload.data.id)
      sessionIdRef.current = payload.data.id
      setPhase('block1')
      setMessage('Bloco 1 - Atenção sustentada: clique apenas no verde.')
      blockStartRef.current = Date.now()
      runGoNoGoBlock()
      trackProgress(GO_NO_GO_DURATION)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar teste')
      setPhase('idle')
      setMessage('Não foi possível iniciar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const runGoNoGoBlock = () => {
    if (goNoGoStimulus) {
      finalizeGoNoGo(goNoGoStimulus, 'NAO_CLICOU', null)
    }
    cleanupTimers()
    setGoNoGoStimulus(null)
    goNoGoIntervalRef.current = setInterval(showGoNoGoStimulus, 1400)
    goNoGoBlockTimeoutRef.current = setTimeout(() => {
      cleanupTimers()
      setGoNoGoStimulus(null)
      setPhase('block2')
      setMessage('Bloco 2 - Conflito Stroop: selecione a cor do texto.')
      blockStartRef.current = Date.now()
      runStroopBlock()
      trackProgress(STROOP_DURATION)
    }, GO_NO_GO_DURATION)
  }

  const showGoNoGoStimulus = () => {
    const random = Math.random()
    const color = random < 0.65 ? 'VERDE' : 'VERMELHO'
    const expected: GoNoGoStimulus['expected'] = color === 'VERDE' ? 'CLICAR' : 'NAO_CLICAR'
    const stimulus: GoNoGoStimulus = {
      id: Date.now(),
      color,
      expected,
      shownAt: Date.now()
    }

    if (goNoGoStimulusTimeoutRef.current) clearTimeout(goNoGoStimulusTimeoutRef.current)
    setGoNoGoStimulus(stimulus)

    goNoGoStimulusTimeoutRef.current = setTimeout(() => {
      finalizeGoNoGo(stimulus, 'NAO_CLICOU', null)
    }, GO_NO_GO_WINDOW)
  }

  const finalizeGoNoGo = (
    stimulus: GoNoGoStimulus,
    userResponse: 'CLICOU' | 'NAO_CLICOU',
    reactionTime: number | null
  ) => {
    const currentSession = sessionIdRef.current || sessionId
    if (!currentSession) return
    setGoNoGoStimulus((current) => (current && current.id === stimulus.id ? null : current))

    const expectedClick = stimulus.expected === 'CLICAR'
    const userClicked = userResponse === 'CLICOU'
    const isCorrect = expectedClick === userClicked
    const errorType = isCorrect ? 'NENHUM' : userClicked ? 'COMISSAO' : 'OMISSAO'

    const event: ReadinessEventInput = {
      session_id: currentSession,
      block_type: 'ATENCAO_SUSTENTADA',
      timestamp: new Date().toISOString(),
      stimulus_type: 'COR',
      stimulus_value: stimulus.color,
      stimulus_color: stimulus.color,
      expected_response: stimulus.expected,
      user_response: userResponse,
      reaction_time_ms: reactionTime,
      is_correct: isCorrect,
      error_type: errorType
    }

    setEvents((prev) => {
      const next = [...prev, event]
      eventsRef.current = next
      return next
    })
  }

  const handleGoNoGoClick = () => {
    if (phase !== 'block1' || !goNoGoStimulus) return
    const reactionTime = Date.now() - goNoGoStimulus.shownAt
    finalizeGoNoGo(goNoGoStimulus, 'CLICOU', reactionTime)
    if (goNoGoStimulusTimeoutRef.current) clearTimeout(goNoGoStimulusTimeoutRef.current)
  }

  const runStroopBlock = () => {
    cleanupTimers()
    const runner = () => {
      if (Date.now() - blockStartRef.current >= STROOP_DURATION) {
        finalizeSession()
        return
      }
      const stimulus = buildStroopStimulus()
      setStroopStimulus(stimulus)
      if (stroopTimeoutRef.current) clearTimeout(stroopTimeoutRef.current)
      stroopTimeoutRef.current = setTimeout(() => {
        logStroop(stimulus, null, null)
        runner()
      }, STROOP_WINDOW)
    }

    stroopRunnerRef.current = runner
    runner()
  }

  const buildStroopStimulus = (): StroopStimulus => {
    const words: StroopStimulus['colorName'][] = ['VERDE', 'VERMELHO', 'AZUL', 'AMARELO']
    const word = words[Math.floor(Math.random() * words.length)]
    const colorName = words[Math.floor(Math.random() * words.length)]

    return {
      id: Date.now(),
      word,
      colorName,
      colorHex: stroopColors[colorName],
      shownAt: Date.now()
    }
  }

  const logStroop = (
    stimulus: StroopStimulus,
    userColor: StroopStimulus['colorName'] | null,
    reactionTime: number | null
  ) => {
    const currentSession = sessionIdRef.current || sessionId
    if (!currentSession) return
    setStroopStimulus((current) => (current && current.id === stimulus.id ? null : current))

    const userResponse = userColor ?? 'SEM_RESPOSTA'
    const isCorrect = Boolean(userColor && userColor === stimulus.colorName)
    const errorType: ReadinessEventInput['error_type'] = !userColor
      ? 'OMISSAO'
      : isCorrect
        ? 'NENHUM'
        : 'CONFLITO'

    const event: ReadinessEventInput = {
      session_id: currentSession,
      block_type: 'STROOP',
      timestamp: new Date().toISOString(),
      stimulus_type: 'PALAVRA_COR',
      stimulus_value: stimulus.word,
      stimulus_color: stimulus.colorName,
      expected_response: stimulus.colorName,
      user_response: userResponse,
      reaction_time_ms: reactionTime,
      is_correct: isCorrect,
      error_type: errorType
    }

    setEvents((prev) => {
      const next = [...prev, event]
      eventsRef.current = next
      return next
    })
  }

  const handleStroopAnswer = (color: StroopStimulus['colorName']) => {
    if (!stroopStimulus || phase !== 'block2') return
    const reactionTime = Date.now() - stroopStimulus.shownAt
    if (stroopTimeoutRef.current) clearTimeout(stroopTimeoutRef.current)
    logStroop(stroopStimulus, color, reactionTime)
    setTimeout(() => {
      stroopRunnerRef.current?.()
    }, 200)
  }

  const trackProgress = (duration: number) => {
    blockStartRef.current = Date.now()
    setProgress(0)

    const interval = setInterval(() => {
      const elapsed = Date.now() - blockStartRef.current
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(interval)
      }
    }, 250)
  }

  const finalizeSession = async () => {
    const effectiveSessionId = sessionIdRef.current || sessionId || eventsRef.current[0]?.session_id
    if (!effectiveSessionId) {
      toast.error('Sessão não iniciada.')
      return
    }
    cleanupTimers()
    setPhase('finished')
    setMessage('Calculando resultado...')
    try {
      setLoading(true)
      const response = await fetch('/api/prontidao/sessions', {
        method: 'PUT',
        body: JSON.stringify({
          session_id: effectiveSessionId,
          events: eventsRef.current
        })
      })

      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Erro ao finalizar sessão')
      }

      const readiness = payload.data?.readiness_score ?? 0
      const risk: ReadinessRiskLevel = payload.data?.risk_level ?? 'ALERTA'
      setResult({ readiness_score: readiness, risk_level: risk })
      setMessage('Teste finalizado. Resultado disponível abaixo.')

      if (payload.deviation && risk === 'ALTO_RISCO') {
        toast.warning('Risco alto detectado. Um desvio foi aberto automaticamente.')
      } else if (risk === 'ALTO_RISCO') {
        toast.warning('Risco alto detectado. Monitore o colaborador.')
      } else {
        toast.success('Teste concluído com sucesso!')
      }
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar teste')
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadge = () => {
    if (!result) return null
    const color =
      result.risk_level === 'APTO'
        ? 'bg-green-100 text-green-800'
        : result.risk_level === 'ALERTA'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
        {result.risk_level}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <Brain className="h-10 w-10 text-blue-200" />
                <div>
                  <h1 className="text-2xl font-bold">Prontidão Cognitiva</h1>
                  <p className="text-base text-slate-300">Sequência rápida (2 min) para atenção e fadiga.</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-300">{message}</p>
                <p className="text-slate-400 mt-1">Matrícula: {matricula || '-'}</p>
          </div>
        </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600/20 rounded-full p-3">
                <Activity className="h-6 w-6 text-blue-200" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <p className="text-lg font-semibold">
                  {phase === 'idle'
                    ? 'Aguardando início'
                    : phase === 'block1'
                      ? 'Bloco 1 - Atenção sustentada'
                      : phase === 'block2'
                        ? 'Bloco 2 - Conflito Stroop'
                        : 'Finalizado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs text-slate-400">Progresso</p>
                <p className="text-lg font-semibold">{progress}%</p>
              </div>
              <div className="w-40 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="h-2 bg-blue-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <button
              onClick={startSession}
              disabled={loading || phase !== 'idle' || !matricula}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar teste
            </button>
            <Link
              href="/prontidao/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao módulo
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1">
            <div className="border border-slate-800 rounded-xl h-[420px] flex items-center justify-center relative overflow-hidden bg-slate-900">
              {phase === 'idle' && (
                <div className="text-center text-slate-200 space-y-3">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-semibold">Quando estiver pronto, clique em "Iniciar teste".</p>
                  <p className="text-base text-slate-300">
                    São dois blocos: Go/No-Go (clique só no verde) e Stroop (escolha a cor do texto).
                  </p>
                </div>
              )}

              {phase === 'block1' && (
                <button
                  onClick={handleGoNoGoClick}
                  className="w-full h-full focus:outline-none"
                  disabled={!goNoGoStimulus}
                >
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-4">
                      Clique apenas quando o estímulo estiver verde.
                    </p>
                    <div
                      className="mx-auto h-32 w-32 rounded-full shadow-lg transition-colors"
                      style={{
                        backgroundColor: goNoGoStimulus?.color === 'VERDE' ? '#16a34a' : '#dc2626',
                        boxShadow: '0 0 25px rgba(0,0,0,0.35)'
                      }}
                    />
                    <p className="mt-4 text-lg font-semibold">
                      {goNoGoStimulus?.color || 'Aguardando estímulo'}
                    </p>
                  </div>
                </button>
              )}

              {phase === 'block2' && stroopStimulus && (
                <div className="space-y-6 w-full px-6 text-center">
                  <div className="text-sm text-slate-300">
                    Escolha a cor real do texto, ignorando a palavra.
                  </div>
                  <div className="text-6xl font-bold" style={{ color: stroopStimulus.colorHex }}>
                    {stroopStimulus.word}
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {(['VERDE', 'VERMELHO', 'AZUL', 'AMARELO'] as StroopStimulus['colorName'][]).map((color) => (
                      <button
                        key={color}
                        onClick={() => handleStroopAnswer(color)}
                        className="border border-slate-700 rounded-md py-3 font-semibold text-sm text-white hover:border-blue-400 transition-colors"
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'finished' && result && (
                <div className="text-center space-y-3">
                  <StopCircle className="h-12 w-12 mx-auto text-slate-400" />
                  <p className="text-lg font-semibold text-white">Resultado: {getRiskBadge()}</p>
                  <p className="text-sm text-slate-300">
                    Score de prontidão: {result.readiness_score.toFixed(1)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Status final</p>
              <div className="flex items-center space-x-3 mt-1">
                {getRiskBadge()}
                <span className="text-lg font-semibold text-white">
                  Score: {result.readiness_score.toFixed(1)}
                </span>
              </div>
            </div>
            {result.risk_level === 'ALTO_RISCO' && (
              <div className="text-right text-red-300 text-sm">
                <p>Risco elevado identificado.</p>
                <p>Orientar o colaborador e acompanhar um responsável.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
