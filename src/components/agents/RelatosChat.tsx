'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Send, Bot, User, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
      <span>{label || 'Digitando'}</span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
        <span
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: '0.12s' }}
        />
        <span
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: '0.24s' }}
        />
      </span>
    </div>
  )
}

marked.setOptions({ breaks: true })

function renderMarkdown(content: string) {
  const html = marked.parse(content, { async: false }) as string
  return { __html: DOMPurify.sanitize(html) }
}

function buildWelcomeMessage(userName?: string) {
  const name = userName?.trim()
  if (name) {
    return `Olá, ${name}! Eu sou o MaxBot, agente de IA especializado em Relatos/Desvios.\n\nMe diga o que você quer consultar (ex.: “relatos em aberto nos últimos 7 dias”, “relatos vencidos”, “top locais (30 dias)”).`
  }

  return 'Olá! Eu sou o MaxBot, agente de IA especializado em Relatos/Desvios.\n\nMe diga o que você quer consultar (ex.: “relatos em aberto nos últimos 7 dias”, “relatos vencidos”, “top locais (30 dias)”).'
}

function inferPeriodoDiasFromText(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*dias/i)
  if (!match) return undefined
  const n = parseInt(match[1], 10)
  if (!Number.isFinite(n)) return undefined
  if (n < 1 || n > 365) return undefined
  return n
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function streamTextResponse(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (done) break
    const text = decoder.decode(result.value, { stream: true })
    if (text) onChunk(text)
  }
}

export function RelatosChat({
  contratoSelecionado,
  userName
}: {
  contratoSelecionado?: string
  userName?: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: makeId(), role: 'assistant', content: buildWelcomeMessage(undefined) }
  ])
  const [hasPersonalizedGreeting, setHasPersonalizedGreeting] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null)
  const [agentStatus, setAgentStatus] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!userName || hasPersonalizedGreeting) return
    setMessages((prev) =>
      prev.length === 1 && prev[0]?.role === 'assistant'
        ? [{ ...prev[0], content: buildWelcomeMessage(userName) }]
        : prev
    )
    setHasPersonalizedGreeting(true)
  }, [userName, hasPersonalizedGreeting])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const quickPrompts = useMemo(
    () => [
      'Relatos em aberto (últimos 7 dias)',
      'Relatos vencidos',
      'Top locais com mais relatos (30 dias)',
      'Por potencial (30 dias)'
    ],
    []
  )

  const sendMessage = async (text: string) => {
    const content = text.trim()
    if (!content || sending) return

    const userMessage: ChatMessage = { id: makeId(), role: 'user', content }
    const assistantId = makeId()

    setSending(true)
    setInput('')
    setPendingAssistantId(assistantId)
    setAgentStatus('Consultando dados')
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const inferredPeriodo = inferPeriodoDiasFromText(content)
      const ui = inferredPeriodo ? { periodo_dias: inferredPeriodo } : undefined

      const payload = {
        messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
        ui,
        contrato: contratoSelecionado
      }

      const response = await fetch('/api/agents/relatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(errText || `Erro HTTP ${response.status}`)
      }

      let acc = ''
      await streamTextResponse(response, (chunk) => {
        const isFirstChunk = acc.length === 0
        acc += chunk
        if (isFirstChunk) setAgentStatus('Montando resposta')
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        )
      })
    } catch (error: unknown) {
      console.error('Erro no chat de relatos:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao conversar com o agente')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      setSending(false)
      setPendingAssistantId(null)
      setAgentStatus(null)
    }
  }

  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Agente de Relatos</CardTitle>
            <CardDescription>
              Consultas somente leitura em <span className="font-medium">vw_relatos_consulta</span>
              {contratoSelecionado ? (
                <>
                  {' '}
                  • Contrato: <span className="font-medium">{contratoSelecionado}</span>
                </>
              ) : null}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages((prev) => prev.slice(0, 1))}
            disabled={sending || messages.length <= 1}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => void sendMessage(p)}
              disabled={sending}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-[420px] overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' ? (
                  <div className="mt-1 text-gray-500">
                    <Bot className="h-5 w-5" />
                  </div>
                ) : null}

                <div
                  className={cn(
                    'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-blue-600 text-white whitespace-pre-wrap'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  )}
                >
                  {m.content ? (
                    m.role === 'assistant' ? (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={renderMarkdown(m.content)}
                      />
                    ) : (
                      m.content
                    )
                  ) : null}
                  {!m.content && m.role === 'assistant' && m.id === pendingAssistantId ? (
                    <TypingIndicator label={agentStatus || undefined} />
                  ) : null}
                </div>

                {m.role === 'user' ? (
                  <div className="mt-1 text-gray-500">
                    <User className="h-5 w-5" />
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendMessage(input)
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Enviar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
