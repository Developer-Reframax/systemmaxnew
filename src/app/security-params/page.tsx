'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Settings, AlertTriangle, FileText, BarChart3, MapPin } from 'lucide-react'
import MainLayout from '@/components/Layout/MainLayout'
import { useAuth } from '@/hooks/useAuth'

interface SecurityParamStats {
  potentials: number
  natures: number
  types: number
  associatedRisks: number
  locations: number
}

export default function SecurityParamsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<SecurityParamStats>({
    potentials: 0,
    natures: 0,
    types: 0,
    associatedRisks: 0,
    locations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        console.error('Token de autenticação não encontrado')
        return
      }

      // Buscar estatísticas de cada endpoint
      const [potentialsRes, naturesRes, typesRes, risksRes, locationsRes] = await Promise.all([
        fetch('/api/security-params/potentials?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/security-params/natures?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/security-params/types?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/security-params/associated-risks?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/security-params/locations?limit=1', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [potentialsData, naturesData, typesData, risksData, locationsData] = await Promise.all([
        potentialsRes.ok ? potentialsRes.json() : { total: 0 },
        naturesRes.ok ? naturesRes.json() : { total: 0 },
        typesRes.ok ? typesRes.json() : { total: 0 },
        risksRes.ok ? risksRes.json() : { total: 0 },
        locationsRes.ok ? locationsRes.json() : { total: 0 }
      ])

      setStats({
        potentials: potentialsData.total || 0,
        natures: naturesData.total || 0,
        types: typesData.total || 0,
        associatedRisks: risksData.total || 0,
        locations: locationsData.total || 0
      })
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const parameterSections = [
    {
      title: 'Potenciais',
      description: 'Gerenciar potenciais de sede e local por contrato',
      icon: Shield,
      count: stats.potentials,
      path: '/security-params/potentials',
      color: 'bg-blue-500'
    },
    {
      title: 'Natureza',
      description: 'Configurar tipos de natureza por contrato',
      icon: FileText,
      count: stats.natures,
      path: '/security-params/natures',
      color: 'bg-green-500'
    },
    {
      title: 'Tipos',
      description: 'Definir tipos de classificação por contrato',
      icon: Settings,
      count: stats.types,
      path: '/security-params/types',
      color: 'bg-purple-500'
    },
    {
      title: 'Riscos Associados',
      description: 'Cadastrar riscos e suas categorias',
      icon: AlertTriangle,
      count: stats.associatedRisks,
      path: '/security-params/associated-risks',
      color: 'bg-red-500'
    },
    {
      title: 'Locais',
      description: 'Gerenciar locais por contrato',
      icon: MapPin,
      count: stats.locations,
      path: '/security-params/locations',
      color: 'bg-yellow-500'
    }
  ]

  if (!user || user.role === 'Usuario') {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Acesso negado. Apenas administradores e editores podem gerenciar parametrizações de segurança.</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parametrização de Segurança</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure os parâmetros de segurança do sistema
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard de Parametrização</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {parameterSections.map((section) => {
            const IconComponent = section.icon
            return (
              <div key={section.title} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {section.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {loading ? (
                        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-12 rounded"></div>
                      ) : (
                        section.count
                      )}
                    </p>
                  </div>
                  <div className={`${section.color} p-3 rounded-lg`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Parameter Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parameterSections.map((section) => {
            const IconComponent = section.icon
            return (
              <div
                key={section.title}
                onClick={() => router.push(section.path)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-blue-500"
              >
                <div className="flex items-start space-x-4">
                  <div className={`${section.color} p-3 rounded-lg flex-shrink-0`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {section.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded"></div>
                        ) : (
                          `${section.count} registros`
                        )}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-800 dark:hover:text-blue-300">
                        Gerenciar →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              onClick={() => router.push('/security-params/potentials')}
              className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Novo Potencial</span>
            </button>
            <button
              onClick={() => router.push('/security-params/natures')}
              className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Nova Natureza</span>
            </button>
            <button
              onClick={() => router.push('/security-params/types')}
              className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Novo Tipo</span>
            </button>
            <button
              onClick={() => router.push('/security-params/associated-risks')}
              className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Novo Risco</span>
            </button>
            <button
              onClick={() => router.push('/security-params/locations')}
              className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">Novo Local</span>
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
