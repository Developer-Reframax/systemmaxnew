'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import Image from 'next/image'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Home,
  LayoutPanelLeft,
  Layers3,
  Lightbulb,
  Mail,
  Menu,
  MessageSquare,
  LogOut,
  Moon,
  Package,
  Settings,
  Shield,
  Sun,
  User,
  UserCheck,
  UserPlus,
  Users,
  Heart,
  Bot,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import type { MenuIcon, MenuItem } from '@/config/menu'

interface MainLayoutProps {
  children: React.ReactNode
  allowedMenuItems: MenuItem[]
}

interface UserContract {
  codigo: string
  nome: string | null
  status: string | null
}

interface MeContractsResponse {
  success: boolean
  currentContract: string | null
  contracts: UserContract[]
  message?: string
}

const iconMap: Record<MenuIcon, React.ComponentType<{ className?: string }>> = {
  home: Home,
  users: Users,
  settings: Settings,
  activity: Activity,
  alertTriangle: AlertTriangle,
  barChart: BarChart3,
  book: BookOpen,
  brain: Brain,
  building: Building2,
  clipboardCheck: ClipboardCheck,
  clipboardList: ClipboardList,
  layoutPanel: LayoutPanelLeft,
  layers: Layers3,
  lightbulb: Lightbulb,
  mail: Mail,
  package: Package,
  shield: Shield,
  userCheck: UserCheck,
  userPlus: UserPlus,
  messageSquare: MessageSquare,
  heart: Heart,
  bot: Bot,
}

export default function MainLayout({ children, allowedMenuItems }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [availableContracts, setAvailableContracts] = useState<UserContract[]>([])
  const [selectedContract, setSelectedContract] = useState<string>('')
  const [isContractDropdownOpen, setIsContractDropdownOpen] = useState(false)
  const [contractsLoaded, setContractsLoaded] = useState(false)
  const [switchingContract, setSwitchingContract] = useState(false)
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const contractDropdownRef = useRef<HTMLDivElement | null>(null)

  const navigate = (href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  useEffect(() => {
    if (!user?.matricula) {
      setAvailableContracts([])
      setSelectedContract('')
      setContractsLoaded(false)
      return
    }

    let cancelled = false

    const loadContracts = async () => {
      try {
        const response = await fetch('/api/me/contracts', {
          method: 'GET',
          credentials: 'include'
        })

        const data = (await response.json().catch(() => ({}))) as MeContractsResponse
        if (!response.ok || !data.success) {
          return
        }

        if (cancelled) return
        const contracts = Array.isArray(data.contracts) ? data.contracts : []
        setAvailableContracts(contracts)
        setSelectedContract(
          data.currentContract || user.contrato_raiz || contracts[0]?.codigo || ''
        )
      } catch (error) {
        console.error('Erro ao carregar contratos do usuario:', error)
      } finally {
        if (!cancelled) {
          setContractsLoaded(true)
        }
      }
    }

    void loadContracts()

    return () => {
      cancelled = true
    }
  }, [user?.contrato_raiz, user?.matricula])

  useEffect(() => {
    if (!isContractDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contractDropdownRef.current &&
        !contractDropdownRef.current.contains(event.target as Node)
      ) {
        setIsContractDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isContractDropdownOpen])

  const selectedContractData = useMemo(
    () => availableContracts.find((contract) => contract.codigo === selectedContract) || null,
    [availableContracts, selectedContract]
  )

  const showContractSelector = availableContracts.length > 1

  const handleContractChange = async (codigoContrato: string) => {
    if (!codigoContrato || codigoContrato === selectedContract || switchingContract) {
      return
    }

    const previousContract = selectedContract
    setSelectedContract(codigoContrato)
    setSwitchingContract(true)
    setIsContractDropdownOpen(false)

    try {
      const response = await fetch('/api/me/contracts', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ codigo_contrato: codigoContrato })
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Erro ao alterar contrato')
      }

      window.location.reload()
    } catch (error) {
      setSelectedContract(previousContract)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar contrato')
    } finally {
      setSwitchingContract(false)
    }
  }

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
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
      >
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

        {/* Area de navegacao com scroll */}
        <nav className="flex-1 overflow-y-auto px-2 py-5">
          <div className="space-y-1">
            {allowedMenuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = iconMap[item.icon] || LayoutPanelLeft
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(item.href)
                  }}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      }`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Rodape fixo - User info and logout */}
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
                {user?.role} - {user?.matricula}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <User className="h-4 w-4" />
            </button>

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
        <div className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
                {allowedMenuItems.find((item) => item.href === pathname)?.name || 'Sistema de Gestao'}
              </h1>
            </div>

            <div className="ml-4 flex items-center gap-3 md:ml-6">
              <div className="hidden md:block">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Bem-vindo, <span className="font-medium text-gray-900 dark:text-white">{user?.nome}</span>
                </span>
              </div>

              {showContractSelector && (
                <div ref={contractDropdownRef} className="relative w-[210px] sm:w-[260px]">
                  <button
                    type="button"
                    onClick={() => setIsContractDropdownOpen((prev) => !prev)}
                    disabled={switchingContract || !contractsLoaded}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-left shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Contrato
                        </p>
                        <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                          {selectedContractData?.codigo || selectedContract || 'Selecionar'}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                          {selectedContractData?.nome || 'Sem nome cadastrado'}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform dark:text-gray-300 ${
                          isContractDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isContractDropdownOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-full max-h-72 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      {availableContracts.map((contract) => {
                        const isSelected = contract.codigo === selectedContract
                        return (
                          <button
                            key={contract.codigo}
                            type="button"
                            onClick={() => void handleContractChange(contract.codigo)}
                            className={`w-full px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                              {contract.codigo}
                            </p>
                            <p className="truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400">
                              {contract.nome || 'Sem nome cadastrado'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
