'use client'

import MainLayout from '@/components/Layout/MainLayout'
import Link from 'next/link'
import { Shield, Brain, Activity, AlertTriangle, Sparkles, LineChart } from 'lucide-react'

const cards = [
  {
    title: 'Realizar teste',
    description: 'Executar o protocolo de 2 blocos (Go/No-Go e Stroop).',
    href: '/prontidao/teste',
    icon: Brain,
    color: 'from-green-500 to-emerald-600'
  },
  {
    title: 'Dashboard',
    description: 'Visão geral de scores, riscos e histórico.',
    href: '/prontidao/dashboard',
    icon: LineChart,
    color: 'from-indigo-500 to-blue-600'
  },
  {
    title: 'Apresentação',
    description: 'Entenda a metodologia e fundamentos do módulo.',
    href: '/prontidao/apresentacao',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600'
  },
  {
    title: 'Desvios',
    description: 'Acompanhar e tratar desvios abertos automaticamente.',
    href: '/prontidao/desvios',
    icon: AlertTriangle,
    color: 'from-red-500 to-orange-600'
  }
]

export default function ProntidaoHomePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-3">
            <Shield className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">Prontidão Cognitiva</h1>
              <p className="text-indigo-100">
                Teste rápido para atenção e fadiga, com monitoramento automático de riscos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group"
            >
              <div className="h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow hover:shadow-lg transition-shadow p-4">
                <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center text-white`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
                <div className="mt-4 inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                  Acessar
                  <Activity className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
