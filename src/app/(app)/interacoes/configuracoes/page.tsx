'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  Settings, 
  Tag, 
  Building2, 
  MapPin, 
  Star, 
  AlertTriangle, 
  Zap,
  Navigation
} from 'lucide-react'

interface ConfigCard {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

const configCards: ConfigCard[] = [
  {
    title: 'Tipos de Interação',
    description: 'Gerenciar tipos de interações de segurança',
    href: '/interacoes/configuracoes/tipos',
    icon: <Tag className="w-6 h-6" />,
    color: 'text-blue-600'
  },
  {
    title: 'Unidades',
    description: 'Configurar unidades organizacionais',
    href: '/interacoes/configuracoes/unidades',
    icon: <Building2 className="w-6 h-6" />,
    color: 'text-green-600'
  },
  {
    title: 'Áreas',
    description: 'Administrar áreas de trabalho',
    href: '/interacoes/configuracoes/areas',
    icon: <MapPin className="w-6 h-6" />,
    color: 'text-purple-600'
  },
  {
    title: 'Classificações',
    description: 'Controlar classificações de interações',
    href: '/interacoes/configuracoes/classificacoes',
    icon: <Star className="w-6 h-6" />,
    color: 'text-yellow-600'
  },
  {
    title: 'Violações',
    description: 'Gerenciar tipos de violações de segurança',
    href: '/interacoes/configuracoes/violacoes',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'text-red-600'
  },
  {
    title: 'Grandes Riscos',
    description: 'Administrar cadastro de grandes riscos',
    href: '/interacoes/configuracoes/grandes-riscos',
    icon: <Zap className="w-6 h-6" />,
    color: 'text-orange-600'
  },
  {
    title: 'Local de Instalação',
    description: 'Configurar locais de instalação',
    href: '/interacoes/configuracoes/local-instalacao',
    icon: <Navigation className="w-6 h-6" />,
    color: 'text-indigo-600'
  }
]

export default function ConfiguracoesInteracoes() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
      <div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Configurações de Interações
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie as configurações do módulo de interações de segurança
          </p>
        </div>

        {/* Navigation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {configCards.map((card, index) => (
            <Link
              key={index}
              href={card.href}
              className="group block"
            >
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full transition-all duration-200 hover:shadow-md hover:border-blue-300 hover:-translate-y-1">
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className={`${card.color} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    {card.icon}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 flex-grow">
                    {card.description}
                  </p>
                  
                  {/* Arrow indicator */}
                  <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                    <span>Acessar</span>
                    <svg 
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Sobre as Configurações
              </h3>
              <p className="text-blue-800 text-sm leading-relaxed">
                As configurações de interações permitem personalizar os dados utilizados no cadastro e 
                classificação das interações de segurança. Cada configuração é específica por contrato 
                e pode ser gerenciada independentemente pelos administradores do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}
