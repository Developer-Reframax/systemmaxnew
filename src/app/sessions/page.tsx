'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import { Sessao } from '@/lib/supabase'
import { Search, Clock, User, Calendar, BarChart3, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface SessionUser {
  matricula: number
  nome: string
}

interface SessionEvent {
  type?: string
  path?: string
  label?: string
  occurred_at?: string
}

interface SessionWithDetails extends Sessao {
  usuario?: SessionUser
  modulos_acessados?: SessionEvent[]
}

interface SessionStats {
  totalSessions: number
  activeSessions: number
  averageDuration: number
  averagePages: number
  topUsers: { nome: string; sessions: number }[]
  topModules: { nome: string; sessions: number }[]
}

export default function SessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    activeSessions: 0,
    averageDuration: 0,
    averagePages: 0,
    topUsers: [],
    topModules: []
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [userFilter, setUserFilter] = useState('all')
  const [users, setUsers] = useState<SessionUser[]>([])

  const getDateRange = useCallback(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch (dateFilter) {
      case 'today':
        return { start: today.toISOString(), end: now.toISOString() }
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
      default:
        return { start: today.toISOString(), end: now.toISOString() }
    }
  }, [dateFilter])

  const fetchSessions = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const { start, end } = getDateRange()
      
      const response = await fetch(`/api/sessions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Erro ao carregar sessões')
      }

      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      toast.error('Erro ao carregar sessões')
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  const fetchStats = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const { start, end } = getDateRange()
      
      const response = await fetch(`/api/sessions/stats?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const statsData = await response.json()
      if (!response.ok || statsData?.success === false) {
        throw new Error(statsData?.message || 'Erro ao carregar estatísticas')
      }

      setStats({
        totalSessions: statsData.totalSessions || 0,
        activeSessions: statsData.activeSessions || 0,
        averageDuration: Math.round(statsData.averageDuration || 0),
        averagePages: Math.round(statsData.averagePages || 0),
        topUsers: statsData.topUsers || [],
        topModules: statsData.topModules || []
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }, [getDateRange])

  useEffect(() => {
    fetchSessions()
    fetchStats()
    fetchUsers()
  }, [dateFilter, fetchSessions, fetchStats])

  const fetchUsers = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || 'Erro ao carregar usuários')
      }

      setUsers(data.users || [])
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = endTime - startTime
    
    const minutes = Math.floor(duration / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  const getLastPage = (session: SessionWithDetails) => {
    const events = session.modulos_acessados || []
    const last = [...events].reverse().find(evt => evt.type === 'page_view' || evt.type === 'login')
    return last?.path || last?.label || '-'
  }

  const getPageCount = (session: SessionWithDetails) => {
    if (typeof session.paginas_acessadas === 'number') return session.paginas_acessadas
    const events = session.modulos_acessados || []
    return events.filter(evt => evt.type === 'page_view').length
  }

  const filteredSessions = sessions.filter(session => {
    const lastPage = getLastPage(session)
    const matchesSearch = 
      session.usuario?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.usuario?.matricula.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastPage.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesUser = userFilter === 'all' || session.usuario?.matricula.toString() === userFilter
    
    return matchesSearch && matchesUser
  })

  if (!user || (user.role !== 'Admin' && user.role !== 'Editor')) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem visualizar sessões.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoramento de Sessões</h1>
          <div className="flex items-center space-x-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="today">Hoje</option>
              <option value="week">Últimos 7 dias</option>
              <option value="month">Últimos 30 dias</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Sessões</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Média de Páginas</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.averagePages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Duração Média</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Math.round(stats.averageDuration)}m
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sessões Ativas</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeSessions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Users and Pages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usuários Mais Ativos</h3>
            <div className="space-y-3">
              {stats.topUsers.map((userItem, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{userItem.nome}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {userItem.sessions} sessões
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Páginas Mais Acessadas</h3>
            <div className="space-y-3">
              {stats.topModules.map((module, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {index + 1}
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{module.nome}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {module.sessions} acessos
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar sessões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Todos os Usuários</option>
            {users.map(userItem => (
              <option key={userItem.matricula} value={userItem.matricula.toString()}>{userItem.nome} ({userItem.matricula})</option>
            ))}
          </select>
        </div>

        {/* Sessions List */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Nenhuma sessão encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Início
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Última Página
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Páginas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duração
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {session.usuario?.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {session.usuario?.matricula}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <div>{new Date(session.inicio_sessao).toLocaleDateString('pt-BR')}</div>
                            <div>{new Date(session.inicio_sessao).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Search className="h-4 w-4" />
                          <span className="truncate max-w-[220px]" title={getLastPage(session)}>
                            {getLastPage(session)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{getPageCount(session)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(session.inicio_sessao, session.fim_sessao)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          session.fim_sessao 
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {session.fim_sessao ? 'Finalizada' : 'Ativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
