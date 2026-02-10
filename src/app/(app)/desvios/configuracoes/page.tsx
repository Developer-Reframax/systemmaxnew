'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Info,
  Building2
} from 'lucide-react'
import { toast } from 'sonner'

interface Contrato {
  id: string
  nome: string
  codigo: string
}

interface Configuracao {
  id?: string
  contrato_id: string
  natureza_obrigatoria: boolean
  tipo_obrigatorio: boolean
  imagem_obrigatoria: boolean
  local_obrigatorio: boolean
  prazo_avaliacao_dias: number
  prazo_resolucao_dias: number
  notificar_vencimento_dias: number
  permitir_edicao_apos_avaliacao: boolean
  created_at?: string
  updated_at?: string
}

const configuracaoPadrao: Omit<Configuracao, 'contrato_id'> = {
  natureza_obrigatoria: true,
  tipo_obrigatorio: true,
  imagem_obrigatoria: false,
  local_obrigatorio: true,
  prazo_avaliacao_dias: 3,
  prazo_resolucao_dias: 15,
  notificar_vencimento_dias: 3,
  permitir_edicao_apos_avaliacao: false
}

export default function ConfiguracoesDesvios() {
  const { user } = useAuth()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [contratoSelecionado, setContratoSelecionado] = useState<string>('')
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalConfig, setOriginalConfig] = useState<Configuracao | null>(null)

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      toast.error('Acesso negado. Apenas administradores podem acessar as configurações.')
      window.location.href = '/desvios'
      return
    }
  }, [user])

  useEffect(() => {
    loadContratos()
  }, [])

  useEffect(() => {
    if (contratoSelecionado) {
      loadConfiguracao(contratoSelecionado)
    } else {
      setConfiguracao(null)
      setOriginalConfig(null)
      setHasChanges(false)
    }
  }, [contratoSelecionado])

  const loadContratos = async () => {
    try {
 
      const response = await fetch('/api/contracts', {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar contratos')
      }

      const data = await response.json()
      
      if (data.success) {
        setContratos(data.data)
        // Selecionar o primeiro contrato automaticamente
        if (data.data.length > 0) {
          setContratoSelecionado(data.data[0].id)
        }
      } else {
        toast.error(data.message || 'Erro ao carregar contratos')
      }
      
    } catch (error) {
      console.error('Error loading contracts:', error)
      toast.error('Erro ao carregar contratos')
    }
  }

  const loadConfiguracao = async (contratoId: string) => {
    try {
      setLoading(true)
    

      const response = await fetch(`/api/desvios/configuracoes?contrato_id=${contratoId}`, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar configuração')
      }

      const data = await response.json()
      
      if (data.success) {
        const config = data.data || { ...configuracaoPadrao, contrato_id: contratoId }
        setConfiguracao(config)
        setOriginalConfig(JSON.parse(JSON.stringify(config)))
        setHasChanges(false)
      } else {
        toast.error(data.message || 'Erro ao carregar configuração')
      }
      
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error('Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (field: keyof Configuracao, value: boolean | number | string) => {
    if (!configuracao) return

    const newConfig = { ...configuracao, [field]: value }
    setConfiguracao(newConfig)
    
    // Verificar se há mudanças
    const hasChangesNow = JSON.stringify(newConfig) !== JSON.stringify(originalConfig)
    setHasChanges(hasChangesNow)
  }

  const handleSave = async () => {
    if (!configuracao || !contratoSelecionado) return

    try {
      setSaving(true)
      

      const response = await fetch('/api/desvios/configuracoes', {
        method: 'POST',
        body: JSON.stringify(configuracao)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao salvar configuração')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Configuração salva com sucesso')
        setOriginalConfig(JSON.parse(JSON.stringify(configuracao)))
        setHasChanges(false)
        // Recarregar configuração para pegar dados atualizados
        loadConfiguracao(contratoSelecionado)
      } else {
        toast.error(data.message || 'Erro ao salvar configuração')
      }
      
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (originalConfig) {
      setConfiguracao(JSON.parse(JSON.stringify(originalConfig)))
      setHasChanges(false)
    }
  }

  const handleResetToDefault = async () => {
    if (!contratoSelecionado) return

    if (!confirm('Tem certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setSaving(true)
      

      const response = await fetch(`/api/desvios/configuracoes?contrato_id=${contratoSelecionado}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao restaurar configuração padrão')
      }

      const data = await response.json()
      
      if (data.success) {
        toast.success('Configuração restaurada para o padrão')
        // Recarregar configuração
        loadConfiguracao(contratoSelecionado)
      } else {
        toast.error(data.message || 'Erro ao restaurar configuração padrão')
      }
      
    } catch (error) {
      console.error('Error resetting configuration:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao restaurar configuração padrão')
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'Admin') {
    return null
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="h-12 w-12 mr-4" />
              <div>
                <h1 className="text-2xl font-bold">Configurações de Desvios</h1>
                <p className="text-blue-100 mt-1">
                  Configure as regras e obrigatoriedades por contrato
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seleção de Contrato */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Selecionar Contrato
            </h2>
          </div>
          
          <div className="max-w-md">
            <select
              value={contratoSelecionado}
              onChange={(e) => setContratoSelecionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione um contrato...</option>
              {contratos.map((contrato) => (
                <option key={contrato.id} value={contrato.id}>
                  {contrato.codigo} - {contrato.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Configurações */}
        {contratoSelecionado && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : configuracao ? (
              <>
                <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      Configurações do Contrato
                    </h2>
                    {hasChanges && (
                      <div className="flex items-center text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Alterações não salvas</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Campos Obrigatórios */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Campos Obrigatórios no Cadastro
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Natureza do Desvio
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Exigir seleção da natureza
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={configuracao.natureza_obrigatoria}
                          onChange={(e) => handleConfigChange('natureza_obrigatoria', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Tipo do Desvio
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Exigir seleção do tipo
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={configuracao.tipo_obrigatorio}
                          onChange={(e) => handleConfigChange('tipo_obrigatorio', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Local do Desvio
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Exigir preenchimento do local
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={configuracao.local_obrigatorio}
                          onChange={(e) => handleConfigChange('local_obrigatorio', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Imagem do Desvio
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Exigir pelo menos uma imagem
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={configuracao.imagem_obrigatoria}
                          onChange={(e) => handleConfigChange('imagem_obrigatoria', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prazos */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Prazos (em dias)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Prazo para Avaliação
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={configuracao.prazo_avaliacao_dias}
                          onChange={(e) => handleConfigChange('prazo_avaliacao_dias', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Tempo para avaliar novos desvios
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Prazo para Resolução
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={configuracao.prazo_resolucao_dias}
                          onChange={(e) => handleConfigChange('prazo_resolucao_dias', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Tempo padrão para resolver desvios
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notificar Vencimento
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={configuracao.notificar_vencimento_dias}
                          onChange={(e) => handleConfigChange('notificar_vencimento_dias', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Dias antes do vencimento para notificar
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Outras Configurações */}
                  <div>
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      Outras Configurações
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Permitir Edição Após Avaliação
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Permite que o criador edite o desvio mesmo após avaliação
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={configuracao.permitir_edicao_apos_avaliacao}
                          onChange={(e) => handleConfigChange('permitir_edicao_apos_avaliacao', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium mb-1">Informações importantes:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>As configurações são aplicadas por contrato</li>
                          <li>Campos obrigatórios são validados no momento do cadastro</li>
                          <li>Prazos são calculados em dias úteis</li>
                          <li>Notificações são enviadas automaticamente</li>
                          <li>Alterações afetam apenas novos desvios</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={handleResetToDefault}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar Padrão
                  </button>
                  
                  <div className="flex items-center space-x-3">
                    {hasChanges && (
                      <button
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Configurações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Erro ao carregar configurações
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Tente selecionar o contrato novamente
                </p>
              </div>
            )}
          </div>
        )}
      </div>
  )
}
