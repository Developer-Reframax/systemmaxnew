import { NextRequest, NextResponse } from 'next/server'
import { RealtimeClient, type RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase env vars not configured' }, { status: 500 })
  }

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 })
  }

  const headers = new Headers(request.headers)
  headers.set('authorization', `Bearer ${token}`)
  const authResult = await verifyJWTToken(new NextRequest(request.url, { headers }))
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error || 'Unauthorized' },
      { status: authResult.status || 401 }
    )
  }

  const realtimeUrl = supabaseUrl.replace(/^http/, 'ws') + '/realtime/v1'
  const client = new RealtimeClient(`${realtimeUrl}/websocket`, {
    params: { apikey: serviceKey },
    headers: { Authorization: `Bearer ${serviceKey}` }
  })

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  const write = (payload: unknown) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)).catch(() => {
      /* stream closed */
    })
  }

  client.connect()

  const channel = client.channel('equipamentos-monitoramento')

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'equipamentos_inspecao' },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      write(payload)
    }
  )

  channel.subscribe()

  write({ type: 'ready' })

  const closeAll = () => {
    try { channel.unsubscribe() } catch { /* ignore */ }
    try { client.disconnect() } catch { /* ignore */ }
    try { writer.close() } catch { /* ignore */ }
  }

  request.signal.addEventListener('abort', () => {
    closeAll()
  })

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

