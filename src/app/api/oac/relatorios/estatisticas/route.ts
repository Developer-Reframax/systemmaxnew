import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Usar service role para bypass RLS em relatórios administrativos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filtro = searchParams.get('filtro') || '30d'
    
    // Calcular data de início baseada no filtro
    const hoje = new Date()
    const dataInicio = new Date()
    
    switch (filtro) {
      case '30d':
        dataInicio.setDate(hoje.getDate() - 30)
        break
      case '90d':
        dataInicio.setDate(hoje.getDate() - 90)
        break
      case '1y':
        dataInicio.setFullYear(hoje.getFullYear() - 1)
        break
      default:
        dataInicio.setDate(hoje.getDate() - 30)
    }



    // Buscar total de OACs no período
    const { data: totalOacs, error: errorTotal } = await supabase
      .from('oacs')
      .select('id')
      .gte('datahora_inicio', dataInicio.toISOString())
      .lt('datahora_inicio', hoje.toISOString())

    if (errorTotal) {
      console.error('Erro ao buscar total de OACs:', errorTotal)
      throw new Error('Erro ao buscar total de OACs')
    }

    // Buscar total de pessoas observadas
    const { data: pessoasObservadas, error: errorPessoas } = await supabase
      .from('oacs')
      .select('qtd_pessoas_local')
      .gte('datahora_inicio', dataInicio.toISOString())
      .lt('datahora_inicio', hoje.toISOString())

    if (errorPessoas) {
      console.error('Erro ao buscar pessoas observadas:', errorPessoas)
      throw new Error('Erro ao buscar pessoas observadas')
    }

    const totalPessoasObservadas = pessoasObservadas?.reduce((acc, oac) => acc + (oac.qtd_pessoas_local || 0), 0) || 0
    const mediaPessoasPorOac = totalOacs && totalOacs.length > 0 ? Math.round(totalPessoasObservadas / totalOacs.length) : 0

    // Buscar desvios por categoria usando uma consulta mais simples
    const { data: desvios, error: errorDesvios } = await supabase
      .from('desvios_oac')
      .select(`
        id,
        oacs!inner(datahora_inicio),
        subcategorias_oac!item_desvio(
          id,
          subcategoria,
          categorias_oac!categoria_pai(
            id,
            categoria
          )
        )
      `)
      .gte('oacs.datahora_inicio', dataInicio.toISOString())
      .lt('oacs.datahora_inicio', hoje.toISOString())

    if (errorDesvios) {
      console.error('Erro ao buscar desvios por categoria:', errorDesvios)
      throw new Error('Erro ao buscar desvios por categoria')
    }

    // Agrupar desvios por categoria
    const desviosPorCategoria = desvios?.reduce((acc: Record<string, { categoria: string; total: number }>, desvio: { 
      id: string;
      oacs: { datahora_inicio: Date }[];
      subcategorias_oac: { 
        id: string;
        subcategoria: string;
        categorias_oac: { id: string; categoria: string }[] 
      }[] 
    }) => {
      const categoria = desvio.subcategorias_oac?.[0]?.categorias_oac?.[0]?.categoria
      if (categoria) {
        if (!acc[categoria]) {
          acc[categoria] = { categoria, total: 0 }
        }
        acc[categoria].total++
      }
      return acc
    }, {}) || {}

    const desviosPorCategoriaArray = Object.values(desviosPorCategoria)

    // Buscar top observadores
    const { data: topObservadores, error: errorObservadores } = await supabase
      .from('oacs')
      .select('observador')
      .gte('datahora_inicio', dataInicio.toISOString())
      .lt('datahora_inicio', hoje.toISOString())

    if (errorObservadores) {
      console.error('Erro ao buscar top observadores:', errorObservadores)
      throw new Error('Erro ao buscar top observadores')
    }

    const observadoresAgrupados = topObservadores.reduce((acc: Record<string, { observador: string; total: number }>, oac: { observador: string }) => {
      const observador = oac.observador
      if (!acc[observador]) {
        acc[observador] = { observador, total: 0 }
      }
      acc[observador].total++
      return acc
    }, {})

    const topObservadoresArray = Object.values(observadoresAgrupados)
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 5)

    // Buscar top locais
    const { data: topLocais, error: errorLocais } = await supabase
      .from('oacs')
      .select('local')
      .gte('datahora_inicio', dataInicio.toISOString())
      .lt('datahora_inicio', hoje.toISOString())

    if (errorLocais) {
      console.error('Erro ao buscar top locais:', errorLocais)
      throw new Error('Erro ao buscar top locais')
    }

    const locaisAgrupados = topLocais.reduce((acc: Record<string, { local: string; total: number }>, oac: { local: string }) => {
      const local = oac.local
      if (!acc[local]) {
        acc[local] = { local, total: 0 }
      }
      acc[local].total++
      return acc
    }, {})

    const topLocaisArray = Object.values(locaisAgrupados)
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 5)

    const estatisticas = {
      total_oacs: totalOacs.length,
      total_pessoas_observadas: totalPessoasObservadas,
      media_pessoas_por_oac: mediaPessoasPorOac,
      desvios_por_categoria: desviosPorCategoriaArray,
      top_observadores: topObservadoresArray,
      top_locais: topLocaisArray,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: hoje.toISOString(),
        filtro
      }
    }



    return NextResponse.json(estatisticas)
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
