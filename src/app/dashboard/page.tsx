'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  Activity,
  Shield,
  FileWarning,
  HeartPulse,
  BookOpen,
  Package
} from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalDesvios: number
  totalEmociogramas: number
  totalBoasPraticas: number
}

interface RecentActivity {
  id: string
  type: 'login' | 'logout' | 'module_access' | 'session'
  user_name: string
  description: string
  timestamp: string
}

interface DashboardResponse {
  success: boolean
  stats: DashboardStats
  recentActivity: RecentActivity[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalDesvios: 0,
    totalEmociogramas: 0,
    totalBoasPraticas: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  // Busca indicadores e atividades via rota segura no backend
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        return
      }

      const response = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar indicadores')
      }

      const data: DashboardResponse = await response.json()
      if (!data.success) {
        throw new Error('Resposta inválida dos indicadores')
      }

      setStats(data.stats)
      setRecentActivity(data.recentActivity)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
      case 'login': return <Activity className="h-4 w-4 text-green-500" />
      case 'logout': return <Activity className="h-4 w-4 text-gray-500" />
      case 'module_access': return <Activity className="h-4 w-4 text-blue-500" />
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

  const quickActions = [
    { href: '/boas-praticas', label: 'Boas Práticas', icon: <BookOpen className="h-6 w-6 text-purple-600" /> },
    { href: '/desvios', label: 'Relatos / Desvios', icon: <FileWarning className="h-6 w-6 text-orange-600" /> },
    { href: '/emociograma', label: 'Emociograma', icon: <HeartPulse className="h-6 w-6 text-red-500" /> },
    { href: '/inspecoes', label: 'Inspeções', icon: <Activity className="h-6 w-6 text-blue-600" /> },
    { href: '/users', label: 'Usuários', icon: <Users className="h-6 w-6 text-green-600" /> },
    { href: '/almoxarifado', label: 'Almoxarifado', icon: <Package className="h-6 w-6 text-indigo-600" /> }
  ]

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
                </span> ativos na plataforma
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileWarning className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Relatos/Desvios
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalDesvios}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.totalDesvios}
                </span> registros no seu contrato
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HeartPulse className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Emociograma
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalEmociogramas}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.totalEmociogramas}
                </span> registros do seu contrato
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Boas Práticas
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {stats.totalBoasPraticas}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats.totalBoasPraticas}
                </span> práticas cadastradas (contrato)
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
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.href}
                type="button"
                onClick={() => router.push(action.href)}
                className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
              >
                {action.icon}
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-3">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
