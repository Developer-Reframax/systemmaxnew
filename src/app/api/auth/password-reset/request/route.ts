import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildResetLink, generateResetToken, maskPhoneNumber } from '@/lib/password-reset'

type ResetUser = {
  matricula: number
  email: string
  nome: string
  phone?: string | null
  telefone?: string | null
  status: string
}

const UMBLER_ENDPOINT = 'https://app-utalk.umbler.com/api/v1/messages/simplified/'
const FROM_PHONE = '+5531982581379'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const umblerToken = process.env.TOKEN_UMBLER_TALK_WHATSAPP_API
const umblerOrganizationId = process.env.ORGANIZATIONID_UMBLER_TALK

function normalizeBrazilPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits
  if (withoutCountry.length !== 11) return null
  return `+55${withoutCountry}`
}

function formatContactName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return 'Usuario'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1]}`
}

export async function POST(request: NextRequest) {
  try {
    const { identifier, confirm } = await request.json()

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Informe sua matricula ou email para redefinir a senha' },
        { status: 400 }
      )
    }

    const trimmed = identifier.trim()

    const { data: user } = await supabase
      .from('usuarios')
      .select('matricula, email, nome, phone, status')
      .or(`email.eq.${trimmed},matricula.eq.${trimmed}`)
      .eq('status', 'ativo')
      .single()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado ou inativo' },
        { status: 404 }
      )
    }

    const typedUser = user as ResetUser

    const phone = typedUser.phone || typedUser.telefone
    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Nao foi possivel redefinir a senha porque nao ha telefone cadastrado. Procure seu lider imediato para abrir um chamado.'
        },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizeBrazilPhone(phone)
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Numero de telefone invalido. Atualize o telefone para o formato +55DDDNXXXXXXXX e tente novamente ou acione seu lider.'
        },
        { status: 400 }
      )
    }

    const maskedPhone = maskPhoneNumber(phone)

    if (!confirm) {
      return NextResponse.json({
        success: true,
        requiresConfirmation: true,
        maskedPhone,
        message: `Enviar link de redefinicao para o WhatsApp terminado em ${maskedPhone}?`
      })
    }

    if (!umblerToken || !umblerOrganizationId) {
      return NextResponse.json(
        { success: false, message: 'Configuracao de WhatsApp ausente no servidor' },
        { status: 500 }
      )
    }

    const token = generateResetToken(Number(typedUser.matricula), typedUser.email)
    const resetLink = buildResetLink(token, request.nextUrl.origin)

    const contactName = formatContactName(typedUser.nome || 'Usuario')
    const message = [
      `🔐 Ola, ${contactName}!`,
      '💡 Recebemos seu pedido para redefinir a senha.',
      '➡️ Link seguro (valido por 2 minutos):',
      `${resetLink}`,
      '',
      '⚠️ Se voce nao solicitou, avise seu lider imediato.'
    ].join('\n')

    const payload = {
      toPhone: normalizedPhone,
      fromPhone: FROM_PHONE,
      organizationId: umblerOrganizationId,
      message,
      file: null,
      skipReassign: false,
      contactName
    }

    const sendResponse = await fetch(UMBLER_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${umblerToken}`
      },
      body: JSON.stringify(payload)
    })

    if (!sendResponse.ok) {
      return NextResponse.json(
        { success: false, message: 'Falha ao enviar o link por WhatsApp. Tente novamente em instantes.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      maskedPhone,
      expiresInMinutes: 2,
      message: `Link de redefinicao gerado e enviado para o WhatsApp terminado em ${maskedPhone}.`
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erro interno ao iniciar redefinicao' },
      { status: 500 }
    )
  }
}
