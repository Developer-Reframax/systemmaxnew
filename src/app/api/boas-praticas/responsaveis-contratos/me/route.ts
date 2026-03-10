import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyJWTToken(request)
    if (!auth.success || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Nao autenticado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const contractFromQuery = searchParams.get('codigo_contrato')
    const contractCode = contractFromQuery || auth.user.contrato_raiz || null

    if (!contractCode) {
      return NextResponse.json({
        success: true,
        isResponsavelSesmt: false,
        contractCode: null
      })
    }

    const userMatricula = Number(auth.user.matricula)
    const { data, error } = await supabase
      .from('boaspraticas_responsaveis_contratos')
      .select('id, responsavel_sesmt, responsavel_gestor')
      .eq('codigo_contrato', contractCode)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Erro ao verificar responsavel SESMT' }, { status: 500 })
    }

    const { data: comiteMembroData, error: comiteMembroError } = await supabase
      .from('boaspraticas_comite_membros')
      .select('comite_id')
      .eq('matricula', userMatricula)
      .limit(1)

    if (comiteMembroError) {
      return NextResponse.json({ error: 'Erro ao verificar membro de comite local' }, { status: 500 })
    }

    let isMembroComiteLocal = false
    let isMembroComiteCorporativo = false
    if (comiteMembroData && comiteMembroData.length > 0) {
      const comiteIds = comiteMembroData.map((row) => row.comite_id).filter((id) => Number.isFinite(id))
      if (comiteIds.length > 0) {
        const { data: comiteLocalData, error: comiteLocalError } = await supabase
          .from('boaspraticas_comite')
          .select('id')
          .in('id', comiteIds)
          .eq('tipo', 'local')
          .eq('codigo_contrato', contractCode)
          .limit(1)
          .maybeSingle()

        if (comiteLocalError) {
          return NextResponse.json(
            { error: 'Erro ao verificar comite local do contrato' },
            { status: 500 }
          )
        }

        isMembroComiteLocal = !!comiteLocalData

        const { data: comiteCorporativoData, error: comiteCorporativoError } = await supabase
          .from('boaspraticas_comite')
          .select('id')
          .in('id', comiteIds)
          .eq('tipo', 'corporativo')
          .limit(1)
          .maybeSingle()

        if (comiteCorporativoError) {
          return NextResponse.json(
            { error: 'Erro ao verificar comite corporativo' },
            { status: 500 }
          )
        }

        isMembroComiteCorporativo = !!comiteCorporativoData
      }
    }

    return NextResponse.json({
      success: true,
      isResponsavelSesmt: !!data && Number(data.responsavel_sesmt) === userMatricula,
      isResponsavelGestor: !!data && Number(data.responsavel_gestor) === userMatricula,
      isMembroComiteLocal,
      isMembroComiteCorporativo,
      contractCode
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
