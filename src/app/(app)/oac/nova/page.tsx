'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  AlertTriangle,
  Target
} from 'lucide-react'
import { toast } from 'sonner'

interface Categoria {
  id: string
  categoria: string
  topico_categoria: string
  subcategorias_oac: Subcategoria[]
}

interface Subcategoria {
  id: string
  subcategoria: string
  topico_subcategoria: string
}

interface Local {
  id: string
  local: string
  contrato: string
}

interface DesvioFormData {
  item_desvio: string
  quantidade_desvios: number
  descricao_desvio: string
}

interface FormData {
  // Etapa 1 - Dados básicos
  local: string
  datahora_inicio: string
  tempo_observacao: number
  qtd_pessoas_local: number
  qtd_pessoas_abordadas: number
  
  // Etapa 2 - Subcategorias (quantidade de desvios por subcategoria)
  subcategorias_desvios: Record<string, number>
  
  // Etapa 3 - Descrição dos desvios
  desvios: DesvioFormData[]
  
  // Etapa 4 - Plano de ação
  acao_recomendada: string
  reconhecimento: string
  condicao_abaixo_padrao: string
  compromisso_formado: string
}

const ETAPAS = [
  { id: 1, titulo: 'Dados Básicos', icone: Clock },
  { id: 2, titulo: 'Avaliação', icone: Eye },
  { id: 3, titulo: 'Desvios', icone: AlertTriangle },
  { id: 4, titulo: 'Plano de Ação', icone: Target }
]

export default function NovaOacPage() {
  const router = useRouter()
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [locais, setLocais] = useState<Local[]>([])
  const [loadingLocais, setLoadingLocais] = useState(true)

  const [formData, setFormData] = useState<FormData>({
    local: '',
    datahora_inicio: '',
    tempo_observacao: 0,
    qtd_pessoas_local: 0,
    qtd_pessoas_abordadas: 0,
    subcategorias_desvios: {},
    desvios: [],
    acao_recomendada: '',
    reconhecimento: '',
    condicao_abaixo_padrao: '',
    compromisso_formado: ''
  })

  useEffect(() => {
    loadCategorias()
    loadLocais()
    // Definir data/hora atual como padrão
    const agora = new Date()
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
    setFormData(prev => ({
      ...prev,
      datahora_inicio: agora.toISOString().slice(0, 16)
    }))
  }, [])

  const loadCategorias = async () => {
    try {
      
      const response = await fetch('/api/oac/categorias?include_subcategorias=true', {
       method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar categorias')
      }

      const data = await response.json()
      console.log('Categorias carregadas:', data) // Para debug
      setCategorias(data)
    } catch (error) {
      console.error('Error loading categorias:', error)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoadingCategorias(false)
    }
  }

  const loadLocais = async () => {
    try {

      const response = await fetch('/api/oac/locais', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar locais')
      }

      const data = await response.json()
      setLocais(data)
    } catch (error) {
      console.error('Error loading locais:', error)
      toast.error('Erro ao carregar locais')
    } finally {
      setLoadingLocais(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubcategoriaChange = (subcategoriaId: string, quantidade: number) => {
    setFormData(prev => ({
      ...prev,
      subcategorias_desvios: {
        ...prev.subcategorias_desvios,
        [subcategoriaId]: quantidade
      }
    }))
  }

  const proximaEtapa = () => {
    if (validarEtapaAtual()) {
      if (etapaAtual === 2) {
        // Ao sair da etapa 2, gerar lista de desvios baseada nas subcategorias selecionadas
        const desvios: DesvioFormData[] = []
        Object.entries(formData.subcategorias_desvios).forEach(([subcategoriaId, quantidade]) => {
          if (quantidade > 0) {
            desvios.push({
              item_desvio: subcategoriaId,
              quantidade_desvios: quantidade,
              descricao_desvio: ''
            })
          }
        })
        setFormData(prev => ({ ...prev, desvios }))
      }
      setEtapaAtual(prev => Math.min(prev + 1, 4))
    }
  }

  const etapaAnterior = () => {
    setEtapaAtual(prev => Math.max(prev - 1, 1))
  }

  const validarEtapaAtual = (): boolean => {
    switch (etapaAtual) {
      case 1:
        if (!formData.local || !formData.datahora_inicio || 
            formData.tempo_observacao <= 0) {
          toast.error('Preencha todos os campos obrigatórios')
          return false
        }
        if (formData.qtd_pessoas_abordadas > formData.qtd_pessoas_local) {
          toast.error('Quantidade de pessoas abordadas não pode ser maior que pessoas no local')
          return false
        }
        return true
      case 2:
        // Pelo menos uma subcategoria deve ter quantidade > 0 ou todas podem ser 0 (observação sem desvios)
        return true
      case 3: {
        // Validar descrições dos desvios se houver
        const desviosComQuantidade = formData.desvios.filter(d => d.quantidade_desvios > 0)
        for (const desvio of desviosComQuantidade) {
          if (!desvio.descricao_desvio.trim()) {
            toast.error('Descreva todos os desvios observados')
            return false
          }
        }
        return true
      }
      case 4:
        // Plano de ação é opcional, mas se preenchido deve ter pelo menos um campo
        return true
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    if (!validarEtapaAtual()) return

    try {
      setLoading(true)

      // Preparar dados para envio
      const desviosParaEnvio = formData.desvios.filter(d => d.quantidade_desvios > 0)
      
      const planoAcao = {
        acao_recomendada: formData.acao_recomendada || null,
        reconhecimento: formData.reconhecimento || null,
        condicao_abaixo_padrao: formData.condicao_abaixo_padrao || null,
        compromisso_formado: formData.compromisso_formado || null
      }

      const dadosEnvio = {
        local: formData.local,
        datahora_inicio: formData.datahora_inicio,
        tempo_observacao: formData.tempo_observacao,
        qtd_pessoas_local: formData.qtd_pessoas_local,
        qtd_pessoas_abordadas: formData.qtd_pessoas_abordadas,
        desvios: desviosParaEnvio,
        plano_acao: planoAcao
      }

      const response = await fetch('/api/oac', {
        method: 'POST',
        body: JSON.stringify(dadosEnvio)
      })

      if (!response.ok) {
        throw new Error('Erro ao criar OAC')
      }

      const data = await response.json()
      if (data.success) {
        toast.success('OAC criada com sucesso!')
        router.push('/oac')
      } else {
        toast.error(data.message || 'Erro ao criar OAC')
      }
    } catch (error) {
      console.error('Error creating OAC:', error)
      toast.error('Erro ao criar OAC')
    } finally {
      setLoading(false)
    }
  }

  const getSubcategoriaNome = (subcategoriaId: string): string => {
    for (const categoria of categorias) {
      const subcategoria = categoria.subcategorias_oac?.find(s => s.id === subcategoriaId)
      if (subcategoria) {
        return `${categoria.categoria} - ${subcategoria.subcategoria}`
      }
    }
    return 'Subcategoria não encontrada'
  }

  const renderEtapa1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Local *
          </label>
          {loadingLocais ? (
            <div className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              Carregando locais...
            </div>
          ) : (
            <select
              value={formData.local}
              onChange={(e) => handleInputChange('local', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Selecione um local</option>
              {locais.map((local) => (
                <option key={local.id} value={local.id}>
                  {local.local}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Data e Hora de Início *
          </label>
          <input
            type="datetime-local"
            value={formData.datahora_inicio}
            onChange={(e) => handleInputChange('datahora_inicio', e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tempo de Observação (minutos) *
          </label>
          <input
            type="number"
            min="1"
            value={formData.tempo_observacao || ''}
            onChange={(e) => handleInputChange('tempo_observacao', parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Duração em minutos"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantidade de Pessoas no Local *
          </label>
          <input
            type="number"
            min="0"
            value={formData.qtd_pessoas_local || ''}
            onChange={(e) => handleInputChange('qtd_pessoas_local', parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Total de pessoas observadas"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantidade de Pessoas Abordadas *
          </label>
          <input
            type="number"
            min="0"
            max={formData.qtd_pessoas_local}
            value={formData.qtd_pessoas_abordadas || ''}
            onChange={(e) => handleInputChange('qtd_pessoas_abordadas', parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Pessoas que foram abordadas"
            required
          />
        </div>


      </div>
    </div>
  )

  const renderEtapa2 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Para cada subcategoria abaixo, informe a quantidade de desvios observados. 
          Deixe em 0 (zero) se não houve desvios nesta categoria.
        </p>
      </div>

      {loadingCategorias ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {categorias.map((categoria) => (
            <div key={categoria.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {categoria.categoria}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {categoria.topico_categoria}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoria.subcategorias_oac?.map((subcategoria) => (
                  <div key={subcategoria.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {subcategoria.subcategoria}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {subcategoria.topico_subcategoria}
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={formData.subcategorias_desvios[subcategoria.id] || 0}
                      onChange={(e) => handleSubcategoriaChange(subcategoria.id, parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Quantidade de desvios"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderEtapa3 = () => (
    <div className="space-y-6">
      {formData.desvios.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Nenhum desvio observado
          </h3>
          <p className="text-green-600 dark:text-green-300">
            Excelente! Esta observação não identificou desvios comportamentais.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-orange-800 dark:text-orange-200 text-sm">
              Descreva detalhadamente cada desvio observado. Seja específico sobre o que foi observado 
              e as circunstâncias.
            </p>
          </div>

          <div className="space-y-4">
            {formData.desvios.map((desvio, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getSubcategoriaNome(desvio.item_desvio)}
                  </h3>
                  <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full text-sm">
                    {desvio.quantidade_desvios} desvio{desvio.quantidade_desvios > 1 ? 's' : ''}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição do Desvio *
                  </label>
                  <textarea
                    value={desvio.descricao_desvio}
                    onChange={(e) => {
                      const novosDesvios = [...formData.desvios]
                      novosDesvios[index].descricao_desvio = e.target.value
                      setFormData(prev => ({ ...prev, desvios: novosDesvios }))
                    }}
                    rows={3}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Descreva detalhadamente o desvio observado..."
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  const renderEtapa4 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Preencha as informações do plano de ação. Todos os campos são opcionais, 
          mas recomenda-se preencher pelo menos um deles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ação Recomendada
          </label>
          <textarea
            value={formData.acao_recomendada}
            onChange={(e) => handleInputChange('acao_recomendada', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descreva as ações recomendadas para correção..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reconhecimento
          </label>
          <textarea
            value={formData.reconhecimento}
            onChange={(e) => handleInputChange('reconhecimento', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Reconhecimentos pelos comportamentos seguros observados..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Condição Abaixo do Padrão
          </label>
          <textarea
            value={formData.condicao_abaixo_padrao}
            onChange={(e) => handleInputChange('condicao_abaixo_padrao', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Descreva as condições que estão abaixo do padrão..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Compromisso Firmado
          </label>
          <textarea
            value={formData.compromisso_formado}
            onChange={(e) => handleInputChange('compromisso_formado', e.target.value)}
            rows={4}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Compromissos firmados com a equipe observada..."
          />
        </div>
      </div>
    </div>
  )

  const renderEtapaAtual = () => {
    switch (etapaAtual) {
      case 1: return renderEtapa1()
      case 2: return renderEtapa2()
      case 3: return renderEtapa3()
      case 4: return renderEtapa4()
      default: return null
    }
  }

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="h-10 w-10 mr-4" />
              <div>
                <h1 className="text-xl font-bold">Nova OAC - Observação Comportamental</h1>
                <p className="text-blue-100 mt-1">
                  Etapa {etapaAtual} de 4: {ETAPAS.find(e => e.id === etapaAtual)?.titulo}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/oac')}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            {ETAPAS.map((etapa, index) => {
              const Icone = etapa.icone
              const isAtual = etapa.id === etapaAtual
              const isConcluida = etapa.id < etapaAtual
              
              return (
                <div key={etapa.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isAtual 
                      ? 'border-blue-600 bg-blue-600 text-white' 
                      : isConcluida 
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400'
                  }`}>
                    {isConcluida ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icone className="h-5 w-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isAtual 
                        ? 'text-blue-600' 
                        : isConcluida 
                          ? 'text-green-600'
                          : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {etapa.titulo}
                    </p>
                  </div>
                  {index < ETAPAS.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isConcluida ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {renderEtapaAtual()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <button
            onClick={etapaAnterior}
            disabled={etapaAtual === 1}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Etapa {etapaAtual} de {ETAPAS.length}
          </div>

          {etapaAtual < 4 ? (
            <button
              onClick={proximaEtapa}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Próxima
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Finalizar OAC
                </>
              )}
            </button>
          )}
        </div>
      </div>
  )
}
