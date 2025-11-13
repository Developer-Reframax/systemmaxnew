'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import Image from 'next/image'

// CSS para animação de background
const backgroundAnimation = `
  @keyframes backgroundPan {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes subtleZoom {
    0% { transform: scale(1); }
    50% { transform: scale(1.03); }
    100% { transform: scale(1); }
  }
  
  @keyframes subtleGlow {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.2; }
  }
  
  .animated-background {
    animation: backgroundPan 25s ease-in-out infinite, subtleZoom 20s ease-in-out infinite;
  }
  
  .glow-overlay {
    animation: subtleGlow 8s ease-in-out infinite;
  }
`

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!identifier.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)
    
    try {
      const result = await login(identifier.trim(), password)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.message || 'Erro no login')
      }
    } catch {
      setError('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: backgroundAnimation }} />
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          {/* Industrial Background Image with animation */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat animated-background"
            style={{
              backgroundImage: `url("/imagem-fundo-usina.webp")`,
              filter: 'brightness(0.7) contrast(1.1) saturate(1.2)',
              backgroundSize: 'cover'
            }}
          />
          {/* Animated overlay to simulate video movement */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent glow-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-800/20 to-blue-900/60"></div>
          {/* Main blue gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/85 via-blue-800/75 to-blue-700/65"></div>
        </div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo-systemmax-white.webp"
            alt="SystemMax Logo"
            width={180}
            height={50}
            className="mx-auto"
            priority
          />
        </div>

        {/* Login Form */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-lg border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Matrícula ou Email
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Digite sua matrícula ou email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Digite sua senha"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <LogIn className="h-4 w-4 mr-2" />
                    Entrar
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sistema de Gestão de Segurança do Trabalho
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Versão 1.0.0
            </p>
          </div>
        </div>

        {/* Logos */}
        <div className="text-center space-y-4">
         
          <Image
            src="/bandeira.webp"
            alt="Bandeira"
            width={50}
            height={20}
            className="mx-auto opacity-80"
          />
        </div>
      </div>
    </div>
    </>
  )
}