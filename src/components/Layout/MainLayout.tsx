'use client'

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import Image from 'next/image'
import {
  Home,
  Users,
  Settings,
  Menu,
  LogOut,
  Moon,
  Sun,
  Shield,

  Building2,
  Layers3,
  Mail,
  UserCheck,
  Activity,
  BarChart3,
  User,
  AlertTriangle,
  Heart,
  ClipboardCheck,
  ClipboardList,
  UserPlus,
  MessageSquare,
  Package
} from 'lucide-react'
import { Lightbulb } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface MainLayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Usuários', href: '/users', icon: Users, roles: ['Admin', 'Editor'] },
  { name: 'Contratos', href: '/contracts', icon: Building2, roles: ['Admin', 'Editor'] },
  { name: 'Módulos', href: '/modules', icon: Layers3, roles: ['Admin'] },
  { name: 'Letras', href: '/letters', icon: Mail, roles: ['Admin', 'Editor'] },
  { name: 'Equipes', href: '/teams', icon: UserCheck, roles: ['Admin', 'Editor'] },
  { name: 'Almoxarifado', href: '/almoxarifado', icon: Package, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Inspeções e Checks', href: '/inspecoes', icon: ClipboardList, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Boas Práticas', href: '/boas-praticas', icon: Lightbulb, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Apadrinhamento', href: '/apadrinhamento', icon: UserPlus, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Interações', href: '/interacoes', icon: MessageSquare, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: '3 P\'s', href: '/3ps', icon: ClipboardCheck, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Relatos/Desvios', href: '/desvios', icon: AlertTriangle, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Gestão de Emociograma', href: '/emociograma', icon: Heart, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'OAC', href: '/oac', icon: ClipboardCheck, roles: ['Admin', 'Editor', 'Viewer'] },
  { name: 'Parametrização de Segurança', href: '/security-params', icon: Shield, roles: ['Admin', 'Editor'] },
  { name: 'Sessões', href: '/sessions', icon: Activity, roles: ['Admin'] },
  { name: 'Relatórios', href: '/reports', icon: BarChart3, roles: ['Admin', 'Editor'] },
  { name: 'Configurações', href: '/settings', icon: Settings, roles: ['Admin'] },
]

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, hasRole, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.some(role => hasRole(role))
  )

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}>
        
        {/* Header fixo */}
        <div className="flex items-center justify-center h-16 px-4 bg-blue-600 dark:bg-blue-700 flex-shrink-0">
          <Image
            src="/logo-systemmax-white.webp"
            alt="SystemMax Logo"
            width={140}
            height={32}
            className="object-contain"
            priority
          />

        </div>
        
        {/* Área de navegação com scroll */}
        <nav className="flex-1 overflow-y-auto px-2 py-5">
          <div className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                  }`} />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Rodapé fixo - User info and logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.nome}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.role} • {user?.matricula}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            
            <Link
              href="/profile"
              className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <User className="h-4 w-4" />
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow">
          <button
            className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {menuItems.find(item => item.href === pathname)?.name || 'Sistema de Gestão'}
              </h1>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              <div className="hidden md:block">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Bem-vindo, <span className="font-medium text-gray-900 dark:text-white">{user?.nome}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}
