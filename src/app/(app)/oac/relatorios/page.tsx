'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BarChart3, PieChart as PieChartIcon, Users, AlertTriangle, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { toast } from 'sonner'

interface EstatisticasOAC {
  total_oacs: number
  total_pessoas_observadas: number
  desvios_por_categoria: Array<{
    categoria: string
    total: number
  }>
  oacs_por_periodo: Array<{
    data: string
    total: number
  }>
  top_observadores: Array<{
    observador: string
    total: number
  }>
  top_locais: Array<{
    local: string
    total: number
  }>
  media_pessoas_por_oac: number
}

const CORES_GRAFICO = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316']

export default function RelatoriosPage() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasOAC | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('30d')

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/oac/relatorios/estatisticas?periodo=${filtro}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      setEstatisticas(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => {
    carregarEstatisticas()
  }, [carregarEstatisticas])

  const StatCard = ({ title, value, icon: Icon, color }: { 
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    color: string 
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  )

  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0 p-3 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse">
          <div className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios OAC</h1>
            <p className="text-gray-600 dark:text-gray-400">Análise e estatísticas das observações</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
                <option value="1y">Último ano</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : estatisticas ? (
            <>
              <StatCard
                title="Total de OACs"
                value={estatisticas.total_oacs}
                icon={BarChart3}
                color="bg-blue-500"
              />
              <StatCard
                title="Pessoas Observadas"
                value={estatisticas.total_pessoas_observadas}
                icon={Users}
                color="bg-green-500"
              />
              <StatCard
                title="Desvios Identificados"
                value={estatisticas.desvios_por_categoria.reduce((acc, item) => acc + item.total, 0)}
                icon={AlertTriangle}
                color="bg-red-500"
              />
              <StatCard
                title="Média Pessoas/OAC"
                value={estatisticas.media_pessoas_por_oac.toFixed(1)}
                icon={Users}
                color="bg-purple-500"
              />
            </>
          ) : null}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras - Desvios por Categoria */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Desvios por Categoria</h3>
            </div>
            
            {loading ? (
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : estatisticas?.desvios_por_categoria.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={estatisticas.desvios_por_categoria}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </div>

          {/* Gráfico de Pizza - Distribuição de Desvios */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <PieChartIcon className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Distribuição de Desvios</h3>
            </div>
            
            {loading ? (
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : estatisticas?.desvios_por_categoria.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estatisticas.desvios_por_categoria}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {estatisticas.desvios_por_categoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Listas de Top */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Observadores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Observadores</h3>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1 mr-4" />
                    <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : estatisticas?.top_observadores.length ? (
              <div className="space-y-3">
                {estatisticas.top_observadores.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white">{item.observador}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {item.total}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
            )}
          </div>

          {/* Top Locais */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Locais</h3>
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1 mr-4" />
                    <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : estatisticas?.top_locais.length ? (
              <div className="space-y-3">
                {estatisticas.top_locais.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white">{item.local}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {item.total}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>
  )
}
