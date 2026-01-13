'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, LogIn, MessageCircle, ShieldCheck, X } from 'lucide-react'
import Image from 'next/image'
import { Orbitron, Space_Grotesk } from 'next/font/google'

const orbitron = Orbitron({ subsets: ['latin'], weight: ['500', '600', '700'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'] })

const backgroundAnimation = `
  :root {
    --tech-blue: #1f6bff;
    --deep-blue: #0a1025;
    --glow-cyan: #44d8ff;
    --card-glass: rgba(255, 255, 255, 0.92);
  }

  @keyframes drift {
    0% { transform: translate3d(0, 0, 0); opacity: 0.45; }
    50% { transform: translate3d(20px, -10px, 0); opacity: 0.75; }
    100% { transform: translate3d(0, 0, 0); opacity: 0.45; }
  }

  @keyframes scan {
    0% { transform: translateY(-120%); opacity: 0; }
    40% { opacity: 0.5; }
    100% { transform: translateY(120%); opacity: 0; }
  }

  @keyframes floaty {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
    100% { transform: translateY(0px); }
  }

  @keyframes pulseRing {
    0% { box-shadow: 0 0 0 0 rgba(68, 216, 255, 0.35); }
    70% { box-shadow: 0 0 0 12px rgba(68, 216, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(68, 216, 255, 0); }
  }

  @keyframes slideHint {
    0% { transform: translateX(-8px); opacity: 0; }
    20% { transform: translateX(0); opacity: 1; }
    80% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(8px); opacity: 0; }
  }

  .stars {
    background-image:
      radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.35) 40%, transparent 42%),
      radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.25) 40%, transparent 42%),
      radial-gradient(2px 2px at 60% 70%, rgba(255,255,255,0.3) 40%, transparent 42%),
      radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.2) 40%, transparent 42%);
  }

  .tech-grid {
    background-image:
      linear-gradient(transparent 0%, rgba(68, 216, 255, 0.08) 40%, transparent 70%),
      linear-gradient(90deg, rgba(68, 216, 255, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(68, 216, 255, 0.08) 1px, transparent 1px);
    background-size: 100% 100%, 40px 40px, 40px 40px;
  }

  .scanline {
    background: linear-gradient(180deg, transparent, rgba(68, 216, 255, 0.25), transparent);
    animation: scan 6s ease-in-out infinite;
  }

  .glow-orb {
    animation: drift 8s ease-in-out infinite;
  }

  .floaty {
    animation: floaty 5s ease-in-out infinite;
  }

  .help-pulse {
    animation: pulseRing 2.2s ease-out infinite;
  }

  .hint-slide {
    animation: slideHint 3.8s ease-in-out infinite;
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
  const [helpOpen, setHelpOpen] = useState(false)

  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

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
      <div className={`min-h-screen ${spaceGrotesk.className} text-slate-100 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1a3a8b_0%,_#0b1126_45%,_#070b16_100%)]" />
        <div className="absolute inset-0 stars opacity-80" />
        <div className="absolute inset-0 tech-grid opacity-40" />
        <div className="absolute inset-0 scanline" />
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-400/20 blur-[120px] glow-orb" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/30 blur-[160px] glow-orb" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-12">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <div className={`inline-flex items-center gap-3 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200 ${orbitron.className}`}>
                Systemmax
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#44d8ff]" />
              </div>
              <h1 className={`text-4xl md:text-5xl font-semibold leading-tight text-white ${orbitron.className}`}>
                Controle inteligente para segurança e qualidade
              </h1>
              <p className="text-base md:text-lg text-slate-200/80 max-w-xl">
                Monitoramento em tempo real, análises preditivas e fluxos de segurança integrados
                para sua operação.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-200/70">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Dashboards dinâmicos</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Alertas inteligentes</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Conformidade total</span>
              </div>
              <div className="relative flex items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-2xl" />
                  <Image
                    src="/mascote-login-systemmax.svg"
                    alt="Mascote Systemmax"
                    width={380}
                    height={380}
                    className="relative drop-shadow-[0_25px_45px_rgba(16,160,255,0.4)] floaty"
                    priority
                  />
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-cyan-400/40 via-blue-500/30 to-indigo-500/30 blur-2xl" />
              <div className="relative rounded-[32px] border border-white/20 bg-white/95 p-8 text-slate-900 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between">
                  <Image
                    src="/logo-systemmax-blue.svg"
                    alt="Systemmax"
                    width={160}
                    height={44}
                    className="h-auto"
                    priority
                  />
                  <span className={`text-xs uppercase tracking-[0.2em] text-blue-500 ${orbitron.className}`}>
                    Login
                  </span>
                </div>

                <div className="mt-6 space-y-2">
                  <h2 className={`text-2xl font-semibold ${orbitron.className}`}>Bem-vindo(a)</h2>
                  <p className="text-sm text-slate-500">Acesse seu painel com segurança reforçada.</p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="identifier" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Matricula
                      </label>
                      <button
                        type="button"
                        onClick={() => setHelpOpen(true)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-600 shadow-sm transition hover:bg-blue-100 help-pulse"
                        aria-label="Ajuda rapida"
                      >
                        ?
                      </button>
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      placeholder="Digite sua matrícula"
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        placeholder="Digite sua senha"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Entrando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Entrar no sistema
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={resetLoading || loading}
                    onClick={handleForgotPassword}
                    className="w-full rounded-2xl border border-blue-200 bg-blue-50 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resetLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600" />
                        Enviando link...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Esqueci minha senha
                      </span>
                    )}
                  </button>

                  {resetMessage && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                      <p>{resetMessage}</p>
                      {resetLink && (
                        <a
                          href={resetLink}
                          className="mt-2 inline-flex items-center gap-1 text-blue-700 font-semibold hover:underline"
                        >
                          Abrir link de redefinicao
                        </a>
                      )}
                    </div>
                  )}
                </form>

                <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#44d8ff]" />
                  Seus dados estao protegidos com segurança avançada.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl rounded-2xl border border-blue-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold text-slate-900 ${orbitron.className}`}>Como fazer login</h3>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fechar ajuda"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-6 md:grid-cols-[1.1fr_0.9fr] items-center">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    Digite sua matricula sem os zeros a esquerda.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-400 line-through">
                      000127520
                    </div>
                    <div className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                      127520
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    'Informe a matricula sem zeros.',
                    'Digite sua senha de acesso.',
                    'Clique em Entrar no sistema.'
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="mt-1 h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </div>
                      <p className="text-sm text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Matricula</p>
                    <p className="mt-1 text-sm text-slate-800">127520</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">Senha</p>
                    <p className="mt-1 text-sm text-slate-800">••••••••</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-400 px-4 py-3 text-center text-sm font-semibold text-white hint-slide">
                    Entrar no sistema
                  </div>
                  <p className="text-xs text-blue-700">
                    Siga o passo a passo e finalize o acesso com seguranca.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-blue-100">Enviaremos o link de redefinicao via WhatsApp</p>
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





