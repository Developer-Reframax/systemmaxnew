import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type OpenAIMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content?: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type RelatosChatMessage = { role: 'user' | 'assistant'; content: string }

export type RelatosAgentContext = {
  userId: number
  allowedContratos: string[]
  selectedContrato?: string
}

type RelatosUiContext = {
  status?: z.infer<typeof statusSchema>
  periodo_dias?: number
}

const statusSchema = z.enum([
  'Aguardando Avaliação',
  'Em Andamento',
  'Concluído',
  'Vencido',
  // tolerância a valores legados sem acento
  'Aguardando Avaliacao',
  'Concluido'
])

const potencialSchema = z.enum(['Intolerável', 'Substancial', 'Moderado', 'Trivial'])

const queryRelatosSchema = z
  .object({
    contrato: z.string().min(1),
    status: statusSchema.optional(),
    potencial: potencialSchema.optional(),
    equipe_id: z.string().uuid().optional(),
    natureza_id: z.number().int().positive().optional(),
    tipo_id: z.number().int().positive().optional(),
    riscoassociado_id: z.number().int().positive().optional(),
    ver_agir: z.boolean().optional(),
    acao_cliente: z.boolean().optional(),
    gerou_recusa: z.boolean().optional(),
    date_from: z.string().datetime().optional(),
    date_to: z.string().datetime().optional(),
    search_text: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional()
      .refine((value) => (value ? !/[(),=&|]/.test(value) : true), {
        message: 'search_text contém caracteres não permitidos'
      }),
    limit: z.number().int().min(1).max(200).optional().default(50),
    offset: z.number().int().min(0).max(5000).optional().default(0)
  })
  .strict()

export type QueryRelatosInput = z.infer<typeof queryRelatosSchema>

export type RelatoConsultaRow = {
  id: string
  created_at: string
  status: string | null
  potencial: string | null
  local: string | null
  descricao: string | null
  ver_agir: boolean | null
  acao_cliente: boolean | null
  gerou_recusa: boolean | null
  data_limite: string | null
  natureza_nome: string | null
  tipo_nome: string | null
  risco_associado_nome: string | null
  equipe_nome: string | null
  autor_nome: string | null
  responsavel: number | null
}

type QueryRelatosResult = {
  contrato: string
  limit: number
  offset: number
  returned: number
  hasMore: boolean
  rows: RelatoConsultaRow[]
}

function normalizeStatus(value?: QueryRelatosInput['status']) {
  if (!value) return undefined
  if (value === 'Aguardando Avaliacao') return 'Aguardando Avaliação'
  if (value === 'Concluido') return 'Concluído'
  return value
}

function sanitizeSearchText(text: string) {
  return text.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim()
}

function createServiceSupabaseClient(signal: AbortSignal) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase env vars não configuradas (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(supabaseUrl, serviceKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal })
    }
  })
}

async function queryRelatos(
  context: RelatosAgentContext,
  input: QueryRelatosInput,
  ui?: RelatosUiContext
): Promise<QueryRelatosResult> {
  const startedAt = Date.now()

  const normalizedStatus = normalizeStatus(input.status)
  const uiStatus = normalizeStatus(ui?.status)
  const effectiveStatus = normalizedStatus ?? uiStatus
  const requestedContrato = input.contrato
  const selectedContrato = context.selectedContrato

  const contrato =
    (requestedContrato && context.allowedContratos.includes(requestedContrato) && requestedContrato) ||
    (selectedContrato && context.allowedContratos.includes(selectedContrato) && selectedContrato) ||
    (context.allowedContratos.length === 1 && context.allowedContratos[0]) ||
    ''

  if (!contrato) {
    throw new Error('Contrato não definido ou não permitido para o usuário.')
  }

  if (!context.allowedContratos.includes(contrato)) {
    throw new Error('Contrato não permitido para o usuário.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const supabase = createServiceSupabaseClient(controller.signal)

    const limit = input.limit ?? 50
    const offset = input.offset ?? 0

    let effectiveDateFrom = input.date_from
    let effectiveDateTo = input.date_to
    if (ui?.periodo_dias) {
      const now = new Date()
      const from = new Date(now.getTime() - ui.periodo_dias * 24 * 60 * 60 * 1000)
      effectiveDateFrom = from.toISOString()
      effectiveDateTo = now.toISOString()
    }

    let query = supabase
      .from('vw_relatos_consulta')
      .select(
        [
          'id',
          'created_at',
          'status',
          'potencial',
          'local',
          'descricao',
          'ver_agir',
          'acao_cliente',
          'gerou_recusa',
          'data_limite',
          'natureza_nome',
          'tipo_nome',
          'risco_associado_nome',
          'equipe_nome',
          'autor_nome',
          'responsavel'
        ].join(',')
      )
      .eq('contrato', contrato)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (effectiveStatus) query = query.eq('status', effectiveStatus)
    if (input.potencial) query = query.eq('potencial', input.potencial)
    if (input.equipe_id) query = query.eq('equipe_id', input.equipe_id)
    if (input.natureza_id) query = query.eq('natureza_id', input.natureza_id)
    if (input.tipo_id) query = query.eq('tipo_id', input.tipo_id)
    if (input.riscoassociado_id) query = query.eq('riscoassociado_id', input.riscoassociado_id)
    if (typeof input.ver_agir === 'boolean') query = query.eq('ver_agir', input.ver_agir)
    if (typeof input.acao_cliente === 'boolean') query = query.eq('acao_cliente', input.acao_cliente)
    if (typeof input.gerou_recusa === 'boolean') query = query.eq('gerou_recusa', input.gerou_recusa)
    if (effectiveDateFrom) query = query.gte('created_at', effectiveDateFrom)
    if (effectiveDateTo) query = query.lte('created_at', effectiveDateTo)

    if (input.search_text) {
      const safe = sanitizeSearchText(input.search_text)
      if (safe) {
        const pattern = `%${safe}%`
        query = query.or(
          `descricao.ilike.${pattern},local.ilike.${pattern},acao.ilike.${pattern},observacao.ilike.${pattern}`
        )
      }
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const rows: RelatoConsultaRow[] = Array.isArray(data) ? (data as unknown as RelatoConsultaRow[]) : []
    const durationMs = Date.now() - startedAt

    console.info('agents.relatos.queryRelatos', {
      userId: context.userId,
      contrato,
      filtros: {
        status: effectiveStatus,
        potencial: input.potencial,
        equipe_id: input.equipe_id,
        natureza_id: input.natureza_id,
        tipo_id: input.tipo_id,
        riscoassociado_id: input.riscoassociado_id,
        ver_agir: input.ver_agir,
        acao_cliente: input.acao_cliente,
        gerou_recusa: input.gerou_recusa,
        date_from: effectiveDateFrom,
        date_to: effectiveDateTo,
        search_text: input.search_text,
        limit,
        offset,
        ui_periodo_dias: ui?.periodo_dias
      },
      durationMs,
      returned: rows.length
    })

    return {
      contrato,
      limit,
      offset,
      returned: rows.length,
      hasMore: rows.length === limit,
      rows
    }
  } finally {
    clearTimeout(timeout)
  }
}

function buildRelatosSystemPrompt(context: RelatosAgentContext) {
  const contratoText =
    context.selectedContrato && context.allowedContratos.includes(context.selectedContrato)
      ? context.selectedContrato
      : context.allowedContratos.length === 1
        ? context.allowedContratos[0]
        : null

  return [
    'Você é o Agente de Relatos (Desvios) do Systemmax. Seu papel é ajudar o usuário a consultar relatos com precisão, de forma humanizada e útil.',
    '',
    'REGRAS (obrigatórias):',
    '- Somente leitura. Nunca proponha/escreva/atualize dados no banco.',
    '- Nunca gere SQL. Para consultar dados, use exclusivamente a ferramenta queryRelatos.',
    '- Nunca invente dados. Se não houver resultados, diga isso e sugira refinamentos.',
    '- Se faltar filtro essencial (principalmente contrato e período), pergunte UMA coisa por vez.',
    '',
    'FORMATO DE RESPOSTA (sempre em 3 partes):',
    '1) Resumo curto',
    '2) Destaques em bullets (máximo 6)',
    '3) Próximo passo sugerido (pergunta ou sugestão de filtro)',
    '',
    'PAGINAÇÃO:',
    '- Se a lista ficar grande, mostre apenas os itens mais relevantes (top N) e ofereça “ver mais” usando offset.',
    '',
    contratoText
      ? `CONTEXTO: contrato (automático) = "${contratoText}". Use este contrato nas consultas e não pergunte contrato.`
      : 'CONTEXTO: contrato do usuário não foi identificado. Pergunte qual contrato deseja consultar.',
    '',
    'DICA: Para perguntas de “top locais”/“por potencial”, você pode consultar até 200 registros (limit=200) e calcular contagens em memória.'
  ].join('\n')
}

function buildToolsForOpenAI() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'queryRelatos',
        description:
          'Consulta relatos (desvios) na view vw_relatos_consulta. Somente leitura. Sempre informar o contrato e filtros opcionais.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            contrato: { type: 'string', description: 'Código do contrato (obrigatório)' },
            status: {
              type: 'string',
              enum: ['Aguardando Avaliação', 'Em Andamento', 'Concluído', 'Vencido']
            },
            potencial: { type: 'string', enum: ['Intolerável', 'Substancial', 'Moderado', 'Trivial'] },
            equipe_id: { type: 'string', description: 'UUID da equipe' },
            natureza_id: { type: 'number' },
            tipo_id: { type: 'number' },
            riscoassociado_id: { type: 'number' },
            ver_agir: { type: 'boolean' },
            acao_cliente: { type: 'boolean' },
            gerou_recusa: { type: 'boolean' },
            date_from: { type: 'string', description: 'ISO datetime (created_at >=)' },
            date_to: { type: 'string', description: 'ISO datetime (created_at <=)' },
            search_text: { type: 'string', description: 'Busca textual (segura) em descricao/local/acao/observacao' },
            limit: { type: 'number', description: 'Default 50, max 200' },
            offset: { type: 'number', description: 'Default 0, max 5000' }
          },
          required: ['contrato']
        }
      }
    }
  ]
}

async function openAIChat(options: {
  messages: OpenAIMessage[]
  tools?: ReturnType<typeof buildToolsForOpenAI>
  toolChoice?: 'auto' | 'none'
  stream?: boolean
}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada.')
  }

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      stream: Boolean(options.stream),
      messages: options.messages,
      tools: options.tools,
      tool_choice: options.toolChoice ?? 'auto'
    })
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Erro no provedor de IA: ${resp.status} ${resp.statusText} ${text}`)
  }

  return resp
}

function streamFromString(content: string) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const chunkSize = 32
      for (let i = 0; i < content.length; i += chunkSize) {
        controller.enqueue(encoder.encode(content.slice(i, i + chunkSize)))
      }
      controller.close()
    }
  })
}

async function streamFromOpenAI(resp: Response) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const reader = resp.body?.getReader()
  if (!reader) return streamFromString('')

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      try {
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (done) break
          buffer += decoder.decode(result.value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice('data:'.length).trim()
            if (data === '[DONE]') {
              controller.close()
              return
            }
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const delta = json.choices?.[0]?.delta?.content
              if (delta) controller.enqueue(encoder.encode(delta))
            } catch {
              // ignora eventos que não são JSON
            }
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    }
  })
}

const chatInputSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1).max(10_000)
        })
      )
      .min(1)
      .max(40),
    ui: z
      .object({
        status: statusSchema.optional(),
        periodo_dias: z.number().int().min(1).max(365).optional()
      })
      .optional()
  })
  .strict()

export async function streamRelatosAgent(context: RelatosAgentContext, input: unknown) {
  const parsed = chatInputSchema.safeParse(input)
  if (!parsed.success) {
    return streamFromString('Não consegui ler sua mensagem. Tente novamente.')
  }

  const system = buildRelatosSystemPrompt(context)
  const tools = buildToolsForOpenAI()

  const convo: OpenAIMessage[] = [
    { role: 'system', content: system },
    ...(parsed.data.ui?.status || parsed.data.ui?.periodo_dias
      ? ([
          {
            role: 'system' as const,
            content: `Contexto de filtros (UI): status=${parsed.data.ui?.status ?? 'não definido'}, periodo_dias=${
              parsed.data.ui?.periodo_dias ?? 'não definido'
            }.`
          }
        ] satisfies OpenAIMessage[])
      : []),
    ...parsed.data.messages.map((m) => ({ role: m.role, content: m.content }) as OpenAIMessage)
  ]

  for (let iter = 0; iter < 4; iter++) {
    const resp = await openAIChat({ messages: convo, tools, toolChoice: 'auto', stream: false })
    const json = (await resp.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: OpenAIToolCall[] }
      }>
    }

    const message = json.choices?.[0]?.message
    if (!message) break

    const toolCalls = message.tool_calls ?? []
    if (toolCalls.length === 0) {
      const content = (message.content ?? '').trim()
      if (!content) return streamFromString('Não consegui gerar uma resposta. Pode reformular?')
      return streamFromString(content)
    }

    convo.push({ role: 'assistant', content: message.content ?? null, tool_calls: toolCalls })

    for (const call of toolCalls) {
      if (call.function.name !== 'queryRelatos') {
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: 'Ferramenta não suportada.' })
        })
        continue
      }

      let argsJson: unknown = null
      try {
        argsJson = JSON.parse(call.function.arguments)
      } catch {
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: 'Argumentos inválidos (JSON).' })
        })
        continue
      }

      const argsParsed = queryRelatosSchema.safeParse(argsJson)
      if (!argsParsed.success) {
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: 'Argumentos inválidos.', details: argsParsed.error.flatten() })
        })
        continue
      }

      try {
        const result = await queryRelatos(context, argsParsed.data, parsed.data.ui)
        convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      } catch (err) {
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
        })
      }
    }
  }

  // fallback: tenta gerar resposta final em streaming, sem ferramentas
  const fallbackResp = await openAIChat({ messages: convo, toolChoice: 'none', stream: true })
  return streamFromOpenAI(fallbackResp)
}
