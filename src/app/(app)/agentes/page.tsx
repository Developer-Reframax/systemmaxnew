'use client'

import { useAuth } from '@/hooks/useAuth'
import { RelatosChat } from '@/components/agents/RelatosChat'
import { Bot, AlertTriangle, Construction } from 'lucide-react'

export default function AgentesPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <Bot className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-bold">Agentes</h1>
            <p className="text-slate-200 mt-1">
              Assistentes especialistas para consultas e análises (somente leitura)
            </p>
            <p className="text-slate-300 text-sm mt-1">
              Usuário: {user?.nome} • Função: {user?.funcao || user?.role}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          className="text-left bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-blue-200 dark:border-blue-900 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          type="button"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Relatos (Desvios)</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pronto para uso</p>
            </div>
          </div>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 opacity-75">
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Agente de Inspeções</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Em breve</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 opacity-75">
          <div className="flex items-center gap-3">
            <Construction className="h-6 w-6 text-gray-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Agente de Almoxarifado</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Em breve</p>
            </div>
          </div>
        </div>
      </div>

      <RelatosChat
        contratoSelecionado={user?.contrato_raiz ?? undefined}
        userName={user?.nome ?? undefined}
      />
    </div>
  )
}
