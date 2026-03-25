import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '@/lib/jwt-middleware'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LocalInfo {
  id: number
  local: string
}

interface EquipeInfo {
  id: string
  equipe: string
}

interface ObservadorInfo {
  matricula?: number | null
  nome?: string | null
  email?: string | null
  funcao?: string | null
  equipe?: { equipe?: string | null } | Array<{ equipe?: string | null }> | null
  letra?: { letra?: string | null } | Array<{ letra?: string | null }> | null
}

interface DesvioInfo {
  id: string
  quantidade_desvios?: number | null
  descricao_desvio?: string | null
  subcategoria?:
    | {
        id?: string
        subcategoria?: string | null
        topico_subcategoria?: string | null
        categoria?:
          | {
              id?: string
              categoria?: string | null
              topico_categoria?: string | null
            }
          | Array<{
              id?: string
              categoria?: string | null
              topico_categoria?: string | null
            }>
          | null
      }
    | Array<{
        id?: string
        subcategoria?: string | null
        topico_subcategoria?: string | null
        categoria?:
          | {
              id?: string
              categoria?: string | null
              topico_categoria?: string | null
            }
          | Array<{
              id?: string
              categoria?: string | null
              topico_categoria?: string | null
            }>
          | null
      }>
    | null
}

interface PlanoAcaoInfo {
  id: string
  acao_recomendada?: string | null
  reconhecimento?: string | null
  condicao_abaixo_padrao?: string | null
  compromisso_formado?: string | null
}

interface OacExportRow {
  id: string
  observador: string | number
  equipe: string
  local: string
  datahora_inicio: string
  tempo_observacao: number
  qtd_pessoas_local: number
  qtd_pessoas_abordadas: number
  contrato: string
  created_at?: string | null
  observador_info?: ObservadorInfo | ObservadorInfo[] | null
  desvios?: DesvioInfo[] | null
  plano_acao?: PlanoAcaoInfo[] | null
}

const firstItem = <T,>(value?: T | T[] | null): T | null => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const getNestedString = <T extends Record<string, unknown>>(
  value: T | T[] | null | undefined,
  key: keyof T
) => {
  const item = firstItem(value)
  const nestedValue = item?.[key]
  return typeof nestedValue === 'string' ? nestedValue : null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.status || 401 }
      )
    }

    const contrato = authResult.user?.contrato_raiz
    if (!contrato) {
      return NextResponse.json(
        { success: false, message: 'Contrato do usuario nao informado' },
        { status: 400 }
      )
    }

    const { data: oacs, error } = await supabase
      .from('oacs')
      .select(`
        *,
        observador_info:observador(
          matricula,
          nome,
          email,
          funcao,
          equipe:equipes!usuarios_equipe_id_fkey(equipe),
          letra:letras!usuarios_letra_id_fkey(letra)
        ),
        desvios:desvios_oac(
          id,
          quantidade_desvios,
          descricao_desvio,
          subcategoria:item_desvio(
            id,
            subcategoria,
            topico_subcategoria,
            categoria:categoria_pai(
              id,
              categoria,
              topico_categoria
            )
          )
        ),
        plano_acao:planos_acao_oac(
          id,
          acao_recomendada,
          reconhecimento,
          condicao_abaixo_padrao,
          compromisso_formado
        )
      `)
      .eq('contrato', contrato)
      .order('datahora_inicio', { ascending: false })

    if (error) {
      console.error('Erro ao buscar OACs para exportacao:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar OACs' },
        { status: 500 }
      )
    }

    const [{ data: locaisData }, { data: equipesData }] = await Promise.all([
      supabase.from('locais').select('id, local'),
      supabase.from('equipes').select('id, equipe')
    ])

    const locaisMap = new Map<number, LocalInfo>((locaisData as LocalInfo[] | null | undefined)?.map((item) => [item.id, item]) || [])
    const equipesMap = new Map<string, EquipeInfo>((equipesData as EquipeInfo[] | null | undefined)?.map((item) => [String(item.id), item]) || [])

    const rows = ((oacs as OacExportRow[] | null) || []).map((oac) => {
      const observadorInfo = firstItem(oac.observador_info)
      const planoAcaoInfo = firstItem(oac.plano_acao)
      const localInfo = locaisMap.get(Number(oac.local))
      const equipeInfo = equipesMap.get(String(oac.equipe))
      const desvios = oac.desvios || []
      const totalDesvios = desvios.reduce((acc, desvio) => acc + (desvio.quantidade_desvios || 0), 0)
      const categoriasDesvios = new Set<string>()
      const topicosCategoriaDesvios = new Set<string>()
      const subcategoriasDesvios = new Set<string>()
      const topicosSubcategoriaDesvios = new Set<string>()
      const desviosDetalhados = desvios.map((desvio) => {
        const subcategoria = firstItem(desvio.subcategoria)
        const categoria = firstItem(subcategoria?.categoria)
        if (categoria?.categoria) categoriasDesvios.add(categoria.categoria)
        if (categoria?.topico_categoria) topicosCategoriaDesvios.add(categoria.topico_categoria)
        if (subcategoria?.subcategoria) subcategoriasDesvios.add(subcategoria.subcategoria)
        if (subcategoria?.topico_subcategoria) topicosSubcategoriaDesvios.add(subcategoria.topico_subcategoria)
        const partes = [
          categoria?.categoria || 'Sem categoria',
          categoria?.topico_categoria || 'Sem topico categoria',
          subcategoria?.subcategoria || 'Sem subcategoria',
          subcategoria?.topico_subcategoria || 'Sem topico subcategoria',
          `Qtd: ${desvio.quantidade_desvios || 0}`,
          desvio.descricao_desvio || 'Sem descricao'
        ]
        return partes.join(' | ')
      }).join(' || ')

      return {
        id: oac.id,
        contrato: oac.contrato,
        datahora_inicio: oac.datahora_inicio,
        created_at: oac.created_at || null,
        tempo_observacao: oac.tempo_observacao,
        qtd_pessoas_local: oac.qtd_pessoas_local,
        qtd_pessoas_abordadas: oac.qtd_pessoas_abordadas,
        local_id: oac.local,
        local_nome: localInfo?.local || oac.local,
        equipe_id: oac.equipe,
        equipe_nome: equipeInfo?.equipe || oac.equipe,
        observador_matricula: observadorInfo?.matricula || oac.observador,
        observador_nome: observadorInfo?.nome || null,
        observador_funcao: observadorInfo?.funcao || null,
        observador_equipe: getNestedString(observadorInfo?.equipe, 'equipe'),
        observador_letra: getNestedString(observadorInfo?.letra, 'letra'),
        total_desvios: totalDesvios,
        categorias_desvios: Array.from(categoriasDesvios).join(' | ') || null,
        topicos_categoria_desvios: Array.from(topicosCategoriaDesvios).join(' | ') || null,
        subcategorias_desvios: Array.from(subcategoriasDesvios).join(' | ') || null,
        topicos_subcategoria_desvios: Array.from(topicosSubcategoriaDesvios).join(' | ') || null,
        desvios_detalhados: desviosDetalhados || null,
        acao_recomendada: planoAcaoInfo?.acao_recomendada || null,
        reconhecimento: planoAcaoInfo?.reconhecimento || null,
        condicao_abaixo_padrao: planoAcaoInfo?.condicao_abaixo_padrao || null,
        compromisso_formado: planoAcaoInfo?.compromisso_formado || null
      }
    })

    return NextResponse.json({
      success: true,
      data: rows
    })
  } catch (error) {
    console.error('OAC export API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
