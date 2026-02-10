'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  Shield,
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, LineChart, Line, Pie } from 'recharts'

interface RelatorioData {
  totalInteracoes: number
  interacoesHoje: number
  grandesRiscos: number
  violacoes: number
  taxaConclusao: number
  interacoesPorStatus: Array<{ status: string; count: number }>
  interacoesPorTipo: Array<{ tipo: string; count: number }>
  interacoesPorUnidade: Array<{ unidade: string; count: number }>
  interacoesPorArea: Array<{ area: string; count: number }>
  interacoesPorClassificacao: Array<{ classificacao: string; count: number }>
  interacoesPorDia: Array<{ data: string; count: number }>
  topUsuarios: Array<{ usuario: string; matricula: number; count: number }>
  violacoesPorTipo: Array<{ violacao: string; count: number }>
  grandesRiscosPorTipo: Array<{ risco: string; count: number }>
}

type TipoRelatorio = 'geral' | 'status' | 'tipos' | 'localizacao' | 'usuarios' | 'riscos' | 'tendencias'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']

const STATUS_LABELS = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
}

export default function RelatoriosInteracoes() {
  const { user } = useAuth()
  const [relatorioData, setRelatorioData] = useState<RelatorioData>({
    totalInteracoes: 0,
    interacoesHoje: 0,
    grandesRiscos: 0,
    violacoes: 0,
    taxaConclusao: 0,
    interacoesPorStatus: [],
    interacoesPorTipo: [],
    interacoesPorUnidade: [],
    interacoesPorArea: [],
    interacoesPorClassificacao: [],
    interacoesPorDia: [],
    topUsuarios: [],
    violacoesPorTipo: [],
    grandesRiscosPorTipo: []
  })
  
  const [loading, setLoading] = useState(true)
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('geral')
  const [periodo, setPeriodo] = useState('30')
  const [gerando, setGerando] = useState(false)
  const [contratoId, setContratoId] = useState<string>('')
  const [contratos, setContratos] = useState<Array<{ id: number; nome: string }>>([])

  useEffect(() => {
    carregarContratos()
  }, [])

  const carregarDadosRelatorio = useCallback(async () => {
    if (!contratoId) return
    
    try {
      setLoading(true)
      
      const response = await fetch(`/api/interacoes/relatorios?periodo=${periodo}&contratoId=${contratoId}`, {
        method: 'GET'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRelatorioData(data.data)
        } else {
          toast.error('Erro ao carregar dados do relatório')
        }
      } else {
        toast.error('Erro ao carregar dados do relatório')
      }
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error)
      toast.error('Erro ao carregar dados do relatório')
    } finally {
      setLoading(false)
    }
  }, [periodo, contratoId])

  useEffect(() => {
    if (contratoId) {
      carregarDadosRelatorio()
    }
  }, [carregarDadosRelatorio, contratoId])

  const carregarContratos = async () => {
    try {
      
      const response = await fetch('/api/contratos', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setContratos(data.data || [])
        if (data.data && data.data.length > 0) {
          setContratoId(data.data[0].id.toString())
        }
      }
    } catch (error) {
      console.error('Erro ao carregar contratos:', error)
    }
  }



  const gerarRelatorio = async () => {
    try {
      setGerando(true)
      
      // Simular geração do relatório
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Criar conteúdo CSV baseado no tipo de relatório selecionado
      let csvContent = ''
      let filename = ''
      
      switch (tipoRelatorio) {
        case 'geral':
          csvContent = 'Relatório Geral de Interações\n\n' +
            `Total de Interações,${relatorioData.totalInteracoes}\n` +
            `Interações Hoje,${relatorioData.interacoesHoje}\n` +
            `Grandes Riscos,${relatorioData.grandesRiscos}\n` +
            `Violações,${relatorioData.violacoes}\n` +
            `Taxa de Conclusão,${relatorioData.taxaConclusao.toFixed(1)}%\n`
          filename = 'relatorio-interacoes-geral.csv'
          break
        case 'status':
          csvContent = 'Status,Quantidade\n' + 
            relatorioData.interacoesPorStatus.map(item => `${STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]},${item.count}`).join('\n')
          filename = 'relatorio-interacoes-status.csv'
          break
        case 'tipos':
          csvContent = 'Tipo,Quantidade\n' + 
            relatorioData.interacoesPorTipo.map(item => `${item.tipo},${item.count}`).join('\n')
          filename = 'relatorio-interacoes-tipos.csv'
          break
        case 'localizacao':
          csvContent = 'Unidade,Quantidade\n' + 
            relatorioData.interacoesPorUnidade.map(item => `${item.unidade},${item.count}`).join('\n')
          filename = 'relatorio-interacoes-localizacao.csv'
          break
        case 'usuarios':
          csvContent = 'Usuário,Matrícula,Quantidade\n' + 
            relatorioData.topUsuarios.map(item => `${item.usuario},${item.matricula},${item.count}`).join('\n')
          filename = 'relatorio-interacoes-usuarios.csv'
          break
        case 'riscos':
          csvContent = 'Violações por Tipo\n' +
            'Tipo,Quantidade\n' +
            relatorioData.violacoesPorTipo.map(item => `${item.violacao},${item.count}`).join('\n') +
            '\n\nGrandes Riscos por Tipo\n' +
            'Tipo,Quantidade\n' +
            relatorioData.grandesRiscosPorTipo.map(item => `${item.risco},${item.count}`).join('\n')
          filename = 'relatorio-interacoes-riscos.csv'
          break
        default:
          csvContent = 'Relatório Geral de Interações\n'
          filename = 'relatorio-interacoes.csv'
      }
      
      // Download do arquivo CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Relatório gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast.error('Erro ao gerar relatório')
    } finally {
      setGerando(false)
    }
  }

  const formatarData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  if (!user || (user.role !== 'Admin' && user.role !== 'Editor')) {
    return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem visualizar relatórios.</p>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios de Interações</h1>
            <p className="text-gray-600 mt-1">Análise detalhada das interações de segurança</p>
          </div>
          <button
            onClick={gerarRelatorio}
            disabled={gerando || loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {gerando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar CSV
              </>
            )}
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contrato
              </label>
              <select
                value={contratoId}
                onChange={(e) => setContratoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um contrato</option>
                {contratos.map(contrato => (
                  <option key={contrato.id} value={contrato.id.toString()}>{contrato.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Relatório
              </label>
              <select
                value={tipoRelatorio}
                onChange={(e) => setTipoRelatorio(e.target.value as TipoRelatorio)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="geral">Relatório Geral</option>
                <option value="status">Por Status</option>
                <option value="tipos">Por Tipos</option>
                <option value="localizacao">Por Localização</option>
                <option value="usuarios">Por Usuários</option>
                <option value="riscos">Riscos e Violações</option>
                <option value="tendencias">Tendências</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Carregando dados do relatório...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total</p>
                    <p className="text-2xl font-semibold text-gray-900">{relatorioData.totalInteracoes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Hoje</p>
                    <p className="text-2xl font-semibold text-gray-900">{relatorioData.interacoesHoje}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Grandes Riscos</p>
                    <p className="text-2xl font-semibold text-gray-900">{relatorioData.grandesRiscos}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Violações</p>
                    <p className="text-2xl font-semibold text-gray-900">{relatorioData.violacoes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Taxa Conclusão</p>
                    <p className="text-2xl font-semibold text-gray-900">{relatorioData.taxaConclusao.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráficos baseados no tipo de relatório */}
            {tipoRelatorio === 'geral' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Interações por Status */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={relatorioData.interacoesPorStatus.map(item => ({
                          ...item,
                          name: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label
                      >
                        {relatorioData.interacoesPorStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Interações por Dia */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Dia</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={relatorioData.interacoesPorDia.map(item => ({
                      ...item,
                      data: formatarData(item.data)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tipoRelatorio === 'status' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={relatorioData.interacoesPorStatus.map(item => ({
                    ...item,
                    status: STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {tipoRelatorio === 'tipos' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Interações por Tipo</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={relatorioData.interacoesPorTipo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tipo" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {tipoRelatorio === 'localizacao' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Unidade</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioData.interacoesPorUnidade}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="unidade" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Área</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioData.interacoesPorArea}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="area" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tipoRelatorio === 'usuarios' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Usuários</h3>
                <div className="space-y-4">
                  {relatorioData.topUsuarios.slice(0, 10).map((usuario, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{usuario.usuario}</p>
                          <p className="text-sm text-gray-500">Mat: {usuario.matricula}</p>
                        </div>
                      </div>
                      <span className="text-lg font-semibold text-blue-600">{usuario.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tipoRelatorio === 'riscos' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Violações por Tipo</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioData.violacoesPorTipo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="violacao" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Grandes Riscos por Tipo</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={relatorioData.grandesRiscosPorTipo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="risco" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#F97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tipoRelatorio === 'tendencias' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendência de Interações</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={relatorioData.interacoesPorDia.map(item => ({
                      ...item,
                      data: formatarData(item.data)
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Classificações</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={relatorioData.interacoesPorClassificacao}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label
                      >
                        {relatorioData.interacoesPorClassificacao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  )
}
