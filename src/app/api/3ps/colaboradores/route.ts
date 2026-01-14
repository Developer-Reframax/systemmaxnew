import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UsuarioColaborador {
  matricula: number
  nome: string
  funcao?: string | null
  equipe?: { equipe?: string | null } | null
  letra?: { letra?: string | null } | null
}

interface Registro3PResumo {
  matricula_criador: number
  participantes?: Array<{ matricula_participante: number | null }> | null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const contrato = authResult.user?.contrato_raiz
    if (!contrato) {
      return NextResponse.json({ error: 'Contrato do usuario nao informado' }, { status: 400 })
    }

    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select(`
        matricula,
        nome,
        funcao,
        equipe:equipes!usuarios_equipe_id_fkey(equipe),
        letra:letras!usuarios_letra_id_fkey(letra)
      `)
      .eq('contrato_raiz', contrato)
      .eq('status', 'ativo')
      .order('nome', { ascending: true })

    if (usuariosError) {
      console.error('Erro ao buscar usuarios:', usuariosError)
      return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
    }

    const { data: registros, error: registrosError } = await supabase
      .from('registros_3ps')
      .select(`
        matricula_criador,
        participantes:participantes_3ps(matricula_participante),
        area:locais(contrato)
      `)
      .eq('area.contrato', contrato)

    if (registrosError) {
      console.error('Erro ao buscar registros 3P:', registrosError)
      return NextResponse.json({ error: 'Erro ao buscar registros 3P' }, { status: 500 })
    }

    const contagens = new Map<number, { created: number; participated: number }>()
    ;(usuarios || []).forEach((usuario) => {
      contagens.set(usuario.matricula, { created: 0, participated: 0 })
    })

    ;(registros as Registro3PResumo[] | null | undefined)?.forEach((registro) => {
      const creator = registro.matricula_criador
      const creatorCount = contagens.get(creator)
      if (creatorCount) {
        creatorCount.created += 1
      }

      registro.participantes?.forEach((p) => {
        const matricula = p.matricula_participante
        if (!matricula || matricula === creator) return
        const participanteCount = contagens.get(matricula)
        if (participanteCount) {
          participanteCount.participated += 1
        }
      })
    })

    const colaboradores = (usuarios as UsuarioColaborador[] | null | undefined)?.map((usuario) => {
      const counts = contagens.get(usuario.matricula) || { created: 0, participated: 0 }
      const total = counts.created + counts.participated
      return {
        matricula: usuario.matricula,
        nome: usuario.nome,
        funcao: usuario.funcao || null,
        equipe: usuario.equipe?.equipe || null,
        letra: usuario.letra?.letra || null,
        createdCount: counts.created,
        participatedCount: counts.participated,
        totalCount: total,
        fez3p: total > 0
      }
    }) || []

    return NextResponse.json({ success: true, data: colaboradores })
  } catch (error) {
    console.error('Erro na API de colaboradores 3P:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
