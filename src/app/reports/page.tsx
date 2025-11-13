'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { supabase } from '@/lib/supabase'
import { Download, Users, Building, BookOpen, AlertTriangle, BarChart3, PieChart, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface ReportData {
  totalUsers: number
  activeUsers: number
  totalContracts: number
  activeContracts: number
  totalTeams: number
  totalModules: number
  totalLetters: number
  pendingLetters: number
  completedLetters: number
  usersByRole: { role: string; count: number }[]
  contractsByLocation: { local: string; count: number }[]
  lettersByStatus: { status: string; count: number }[]
  moduleUsage: { nome: string; sessions: number }[]
  teamDistribution: { nome: string; members: number }[]
}

type ReportType = 'users' | 'contracts' | 'teams' | 'modules' | 'letters' | 'sessions'

export default function ReportsPage() {
  const { user } = useAuth()
  const [reportData, setReportData] = useState<ReportData>({
    totalUsers: 0,
    activeUsers: 0,
    totalContracts: 0,
    activeContracts: 0,
    totalTeams: 0,
    totalModules: 0,
    totalLetters: 0,
    pendingLetters: 0,
    completedLetters: 0,
    usersByRole: [],
    contractsByLocation: [],
    lettersByStatus: [],
    moduleUsage: [],
    teamDistribution: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<ReportType>('users')
  const [dateRange, setDateRange] = useState('month')
  const [generating, setGenerating] = useState(false)

  const getDateRange = useCallback(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateRange) {
      case 'week': {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return { start: weekStart.toISOString(), end: now.toISOString() }
      }
      case 'month': {
        const monthStart = new Date(today)
        monthStart.setDate(today.getDate() - 30)
        return { start: monthStart.toISOString(), end: now.toISOString() }
      }
      case 'quarter': {
        const quarterStart = new Date(today)
        quarterStart.setDate(today.getDate() - 90)
        return { start: quarterStart.toISOString(), end: now.toISOString() }
      }
      case 'year': {
        const yearStart = new Date(today)
        yearStart.setDate(today.getDate() - 365)
        return { start: yearStart.toISOString(), end: now.toISOString() }
      }
      default: {
        const defaultMonthStart = new Date(today)
        defaultMonthStart.setDate(today.getDate() - 30)
        return { start: defaultMonthStart.toISOString(), end: now.toISOString() }
      }
    }
  }, [dateRange])

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Users data
      const { data: users } = await supabase
        .from('usuarios')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)

      const { count: totalUsers } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })

      const { count: activeUsers } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Contracts data
      const { data: contracts } = await supabase
        .from('contratos')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)

      const { count: totalContracts } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })

      const { count: activeContracts } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Teams data
      const { count: totalTeams } = await supabase
        .from('equipes')
        .select('*', { count: 'exact', head: true })

      const { data: teams } = await supabase
        .from('equipes')
        .select(`
          *,
          usuario_equipes(count)
        `)

      // Modules data
      const { count: totalModules } = await supabase
        .from('modulos')
        .select('*', { count: 'exact', head: true })

      const { data: moduleUsage } = await supabase
        .from('sessoes')
        .select(`
          modulo_id,
          modulo:modulos(nome)
        `)
        .gte('inicio', start)
        .lte('inicio', end)

      // Letters data
      const { count: totalLetters } = await supabase
        .from('letras')
        .select('*', { count: 'exact', head: true })

      const { count: pendingLetters } = await supabase
        .from('letras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')

      const { count: completedLetters } = await supabase
        .from('letras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluida')

      const { data: letters } = await supabase
        .from('letras')
        .select('status')
        .gte('created_at', start)
        .lte('created_at', end)

      // Process data for charts
      const usersByRole = users?.reduce((acc: { role: string; count: number }[], user) => {
        const role = user.role
        const existing = acc.find((item: { role: string; count: number }) => item.role === role)
        if (existing) {
          existing.count++
        } else {
          acc.push({ role, count: 1 })
        }
        return acc
      }, []) || []

      const contractsByLocation = contracts?.reduce((acc: { local: string; count: number }[], contract) => {
        const local = contract.local || 'Não informado'
        const existing = acc.find((item: { local: string; count: number }) => item.local === local)
        if (existing) {
          existing.count++
        } else {
          acc.push({ local, count: 1 })
        }
        return acc
      }, []) || []

      const lettersByStatus = letters?.reduce((acc: { status: string; count: number }[], letter) => {
        const status = letter.status
        const existing = acc.find((item: { status: string; count: number }) => item.status === status)
        if (existing) {
          existing.count++
        } else {
          acc.push({ status, count: 1 })
        }
        return acc
      }, []) || []

      const moduleUsageStats = moduleUsage?.reduce((acc: { nome: string; sessions: number }[], session) => {
        // const moduleId = session.modulo_id
        const moduleName = Array.isArray(session.modulo)
          ? (session.modulo[0] as { nome: string })?.nome
          : (session.modulo as { nome: string })?.nome || 'Módulo Desconhecido'
        const existing = acc.find((item: { nome: string; sessions: number }) => item.nome === moduleName)
        if (existing) {
          existing.sessions++
        } else {
          acc.push({ nome: moduleName, sessions: 1 })
        }
        return acc
      }, []) || []

      const teamDistribution = teams?.map((team: { nome: string; usuario_equipes?: { length: number }[] }) => ({
        nome: team.nome,
        members: team.usuario_equipes?.length || 0
      })) || []

      setReportData({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        totalContracts: totalContracts || 0,
        activeContracts: activeContracts || 0,
        totalTeams: totalTeams || 0,
        totalModules: totalModules || 0,
        totalLetters: totalLetters || 0,
        pendingLetters: pendingLetters || 0,
        completedLetters: completedLetters || 0,
        usersByRole,
        contractsByLocation,
        lettersByStatus,
        moduleUsage: moduleUsageStats.sort((a, b) => b.sessions - a.sessions).slice(0, 10),
        teamDistribution: teamDistribution.sort((a: { members: number }, b: { members: number }) => b.members - a.members)
      })
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error)
      toast.error('Erro ao carregar dados do relatório')
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  const generateReport = async () => {
    try {
      setGenerating(true)
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create CSV content based on selected report type
      let csvContent = ''
      let filename = ''
      
      switch (selectedReport) {
        case 'users':
          csvContent = 'Função,Quantidade\n' + 
            reportData.usersByRole.map(item => `${item.role},${item.count}`).join('\n')
          filename = 'relatorio-usuarios.csv'
          break
        case 'contracts':
          csvContent = 'Local,Quantidade\n' + 
            reportData.contractsByLocation.map(item => `${item.local},${item.count}`).join('\n')
          filename = 'relatorio-contratos.csv'
          break
        case 'letters':
          csvContent = 'Status,Quantidade\n' + 
            reportData.lettersByStatus.map(item => `${item.status},${item.count}`).join('\n')
          filename = 'relatorio-letras.csv'
          break
        case 'modules':
          csvContent = 'Módulo,Sessões\n' + 
            reportData.moduleUsage.map(item => `${item.nome},${item.sessions}`).join('\n')
          filename = 'relatorio-modulos.csv'
          break
        case 'teams':
          csvContent = 'Equipe,Membros\n' + 
            reportData.teamDistribution.map(item => `${item.nome},${item.members}`).join('\n')
          filename = 'relatorio-equipes.csv'
          break
        default:
          csvContent = 'Relatório Geral\n'
          filename = 'relatorio-geral.csv'
      }
      
      // Download CSV file
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
      setGenerating(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'Admin': return 'Administrador'
      case 'Editor': return 'Editor'
      case 'Usuario': return 'Usuário'
      default: return role
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Pendente'
      case 'em_andamento': return 'Em Andamento'
      case 'concluida': return 'Concluída'
      case 'cancelada': return 'Cancelada'
      default: return status
    }
  }

  if (!user || (user.role !== 'Admin' && user.role !== 'Editor')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem visualizar relatórios.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios e Analytics</h1>
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="quarter">Último trimestre</option>
              <option value="year">Último ano</option>
            </select>
            <button
              onClick={generateReport}
              disabled={generating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Gerando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuários</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{reportData.totalUsers}</p>
                <p className="text-xs text-green-600">{reportData.activeUsers} ativos</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Contratos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{reportData.totalContracts}</p>
                <p className="text-xs text-green-600">{reportData.activeContracts} ativos</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cartas de Segurança</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{reportData.totalLetters}</p>
                <p className="text-xs text-yellow-600">{reportData.pendingLetters} pendentes</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Módulos</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{reportData.totalModules}</p>
                <p className="text-xs text-purple-600">{reportData.totalTeams} equipes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tipo de Relatório</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { type: 'users', label: 'Usuários', icon: Users },
              { type: 'contracts', label: 'Contratos', icon: Building },
              { type: 'teams', label: 'Equipes', icon: Users },
              { type: 'modules', label: 'Módulos', icon: BookOpen },
              { type: 'letters', label: 'Cartas', icon: AlertTriangle },
              { type: 'sessions', label: 'Sessões', icon: BarChart3 }
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setSelectedReport(type as ReportType)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedReport === type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <Icon className={`h-6 w-6 mx-auto mb-2 ${
                  selectedReport === type ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedReport === type 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users by Role */}
          {selectedReport === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Usuários por Função
              </h3>
              <div className="space-y-3">
                {reportData.usersByRole.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-blue-500 rounded" style={{ 
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                      }}></div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getRoleLabel(item.role)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts by Location */}
          {selectedReport === 'contracts' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Contratos por Local
              </h3>
              <div className="space-y-3">
                {reportData.contractsByLocation.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {item.local}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.count / Math.max(...reportData.contractsByLocation.map(c => c.count))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Letters by Status */}
          {selectedReport === 'letters' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Cartas por Status
              </h3>
              <div className="space-y-3">
                {reportData.lettersByStatus.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item.status === 'concluida' ? 'bg-green-500' :
                        item.status === 'em_andamento' ? 'bg-yellow-500' :
                        item.status === 'pendente' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module Usage */}
          {selectedReport === 'modules' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Uso de Módulos
              </h3>
              <div className="space-y-3">
                {reportData.moduleUsage.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {item.nome}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.sessions / Math.max(...reportData.moduleUsage.map(m => m.sessions))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                        {item.sessions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Distribution */}
          {selectedReport === 'teams' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Distribuição de Equipes
              </h3>
              <div className="space-y-3">
                {reportData.teamDistribution.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {item.nome}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.members / Math.max(...reportData.teamDistribution.map(t => t.members))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                        {item.members}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
