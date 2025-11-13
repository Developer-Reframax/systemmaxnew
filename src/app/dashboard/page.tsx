'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Building2,
  Layers3,
  Activity,
  TrendingUp,
  Clock,
  Shield
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalContracts: number
  activeContracts: number
  totalModules: number
  activeModules: number
  todaySessions: number
  activeSessions: number
}

interface RecentActivity {
  id: string
  type: 'login' | 'logout' | 'module_access'
  user_name: string
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const { user, hasRole } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalContracts: 0,
    activeContracts: 0,
    totalModules: 0,
    activeModules: 0,
    todaySessions: 0,
    activeSessions: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load statistics
      const [usersData, contractsData, modulesData, sessionsData] = await Promise.all([
        supabase.from('usuarios').select('status'),
        supabase.from('contratos').select('status'),
        supabase.from('modulos').select('ativo'),
        supabase.from('sessoes').select('*').gte('inicio_sessao', new Date().toISOString().split('T')[0])
      ])

      const newStats: DashboardStats = {
        totalUsers: usersData.data?.length || 0,
        activeUsers: usersData.data?.filter(u => u.status === 'ativo').length || 0,
        totalContracts: contractsData.data?.length || 0,
        activeContracts: contractsData.data?.filter(c => c.status === 'ativo').length || 0,
        totalModules: modulesData.data?.length || 0,
        activeModules: modulesData.data?.filter(m => m.ativo).length || 0,
        todaySessions: sessionsData.data?.length || 0,
        activeSessions: sessionsData.data?.filter(s => !s.fim_sessao).length || 0
      }

      setStats(newStats)

      // Load recent activity (mock data for now)
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'login',
          user_name: user?.nome || 'Usuário',
          description: 'Fez login no sistema',
          timestamp: new Date().toISOString()
        },
        {
          id: '2',
          type: 'module_access',
          user_name: 'João Silva',
          description: 'Acessou o módulo de Gestão de Usuários',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'logout',
          user_name: 'Maria Santos',
          description: 'Fez logout do sistema',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        }
      ]
      
      setRecentActivity(mockActivity)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.nome])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'logout': return <Clock className="h-4 w-4 text-gray-500" />
      case 'module_access': return <Layers3 className="h-4 w-4 text-blue-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center">
            <Shield className="h-12 w-12 mr-4" />
            <div>
              <h1 className="text-2xl font-bold">Bem-vindo, {user?.nome}!</h1>
              <p className="text-blue-100 mt-1">
                Sistema de Gestão de Segurança do Trabalho
              </p>
              <p className="text-blue-200 text-sm mt-1">
                Função: {user?.funcao || user?.role} • Matrícula: {user?.matricula}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Usuários
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.activeUsers}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        / {stats.totalUsers}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.activeUsers}
                </span> ativos
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Contratos
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.activeContracts}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        / {stats.totalContracts}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.activeContracts}
                </span> ativos
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Layers3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Módulos
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.activeModules}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        / {stats.totalModules}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.activeModules}
                </span> ativos
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Sessões Hoje
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.activeSessions}
                      </div>
                      <div className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        / {stats.todaySessions}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.activeSessions}
                </span> ativas
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Atividade Recente
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user_name}</span>{' '}
                      {activity.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {hasRole(['Admin', 'Editor']) && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasRole('Admin') && (
                <a
                  href="/users"
                  className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Users className="h-6 w-6 text-blue-600 mr-3" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Gerenciar Usuários
                  </span>
                </a>
              )}
              
              <a
                href="/contracts"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Building2 className="h-6 w-6 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Gerenciar Contratos
                </span>
              </a>
              
              <a
                href="/reports"
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Activity className="h-6 w-6 text-purple-600 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Ver Relatórios
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
