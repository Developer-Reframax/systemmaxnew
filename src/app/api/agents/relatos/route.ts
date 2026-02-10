import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { streamRelatosAgent } from '@/lib/agents/relatos'

const bodySchema = z
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
    contrato: z.string().min(1).optional(),
    ui: z
      .object({
        status: z
          .enum(['Aguardando Avaliação', 'Em Andamento', 'Concluído', 'Vencido', 'Aguardando Avaliacao', 'Concluido'])
          .optional(),
        periodo_dias: z.number().int().min(1).max(365).optional()
      })
      .optional()
  })
  .strict()

function createServiceSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase env vars não configuradas (SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY)')
  }

  return createClient(supabaseUrl, serviceKey)
}

async function getAllowedContratos(matricula: number): Promise<string[]> {
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase
    .from('usuario_contratos')
    .select('codigo_contrato')
    .eq('matricula_usuario', matricula)

  if (error) throw new Error(error.message)

  const codes = (data ?? [])
    .map((row) => row.codigo_contrato as string | null)
    .filter((v): v is string => Boolean(v))

  return Array.from(new Set(codes))
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error ?? 'Não autorizado' },
        { status: authResult.status ?? 401 }
      )
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Body inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const userId = authResult.user.matricula
    const contratoRaiz = authResult.user.contrato_raiz
    const fromDb = contratoRaiz ? [] : await getAllowedContratos(userId)
    const allowedContratos = contratoRaiz ? [contratoRaiz] : fromDb

    const selectedContrato = allowedContratos.length === 1 ? allowedContratos[0] : undefined

    const stream = await streamRelatosAgent(
      { userId, allowedContratos, selectedContrato },
      { messages: parsed.data.messages, ui: parsed.data.ui }
    )

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform'
      }
    })
  } catch (error: unknown) {
    console.error('Erro em /api/agents/relatos:', error)
    return NextResponse.json({ success: false, message: 'Erro interno do servidor' }, { status: 500 })
  }
}
