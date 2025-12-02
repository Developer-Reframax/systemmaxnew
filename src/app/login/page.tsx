'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, LogIn, MessageCircle, ShieldCheck, X } from 'lucide-react'
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
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pendingIdentifier, setPendingIdentifier] = useState('')
  
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

  const handleForgotPassword = async () => {
    setError('')
    setResetMessage('')
    setResetLink(null)
    setConfirmText('')
    setPendingIdentifier('')

    if (!identifier.trim()) {
      setError('Informe sua matricula para redefinir a senha')
      return
    }

    setResetLoading(true)

    try {
      // Passo 1: pedir ao backend os dados do telefone e mensagem de confirmacao
      const lookupResponse = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), confirm: false })
      })

      const lookupData = await lookupResponse.json()

      if (!lookupResponse.ok || !lookupData.success) {
        setError(lookupData.message || 'Nao foi possivel iniciar a redefinicao.')
        return
      }

      // Passo 2: pedir confirmacao explicita do usuario
      const confirmationText =
        lookupData.message ||
        `Enviar link de redefinicao para o numero terminado em ${lookupData.maskedPhone || '****'}?`

      setConfirmText(confirmationText)
      setPendingIdentifier(identifier.trim())
      setConfirmOpen(true)
    } catch {
      setError('Erro ao iniciar a redefinicao de senha')
    } finally {
      setResetLoading(false)
    }
  }

  const sendResetLink = async () => {
    setResetLoading(true)
    setConfirmOpen(false)
    setResetMessage('')
    setError('')

    try {
      const sendResponse = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: pendingIdentifier || identifier.trim(), confirm: true })
      })

      const sendData = await sendResponse.json()

      if (!sendResponse.ok || !sendData.success) {
        setError(sendData.message || 'Nao foi possivel gerar o link de redefinicao.')
        return
      }

      setResetMessage(sendData.message || 'Link enviado para o WhatsApp cadastrado.')

      if (sendData.resetLink) {
        setResetLink(sendData.resetLink as string)
      }
    } catch {
      setError('Erro ao enviar o link de redefinicao')
    } finally {
      setResetLoading(false)
      setPendingIdentifier('')
      setConfirmText('')
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
                Matrícula
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
                placeholder="Digite sua matrícula sem os zeros"
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

            <div>
              <button
                type="button"
                disabled={resetLoading || loading}
                onClick={handleForgotPassword}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resetLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    Enviando link...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Esqueci minha senha
                  </>
                )}
              </button>
              {resetMessage && (
                <div className="mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
                  <p>{resetMessage}</p>
                  {resetLink && (
                    <a
                      href={resetLink}
                      className="inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline mt-1"
                    >
                      Abrir link de redefinicao
                    </a>
                  )}
                </div>
              )}
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

    {confirmOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
        <div className="relative max-w-md w-full bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <div className="p-2 bg-white/15 rounded-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide">Confirmar envio</p>
              <p className="text-xs text-blue-100">Enviaremos o link de redefinição via WhatsApp</p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="ml-auto text-white/80 hover:text-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-6 space-y-4">
            <p className="text-sm text-slate-700">{confirmText}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={sendResetLink}
                disabled={resetLoading}
                className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {resetLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                    Enviando
                  </>
                ) : (
                  'Enviar link'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
