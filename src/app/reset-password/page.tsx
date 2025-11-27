'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Lock, ShieldAlert } from 'lucide-react'

interface VerifyResponse {
  success: boolean
  data?: {
    matricula: number
    email: string
    expiresAt: string
  }
  message?: string
}

interface ConfirmResponse {
  success: boolean
  message?: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = useMemo(() => searchParams?.get('token') || '', [searchParams])

  const [loadingVerify, setLoadingVerify] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [email, setEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token nao informado. Solicite um novo link de redefinicao.')
        setLoadingVerify(false)
        return
      }

      try {
        const response = await fetch('/api/auth/password-reset/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data: VerifyResponse = await response.json()

        if (!data.success || !data.data) {
          setError(data.message || 'Token invalido ou expirado. Solicite um novo link.')
        } else {
          setEmail(data.data.email)
          setExpiresAt(data.data.expiresAt)
        }
      } catch {
        setError('Erro ao validar o token de redefinicao')
      } finally {
        setLoadingVerify(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!newPassword || !confirmPassword) {
      setError('Preencha a nova senha e a confirmacao.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas precisam ser iguais.')
      return
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword })
      })

      const data: ConfirmResponse = await response.json()

      if (!response.ok || !data.success) {
        setError(data.message || 'Nao foi possivel redefinir a senha.')
        return
      }

      setSuccessMessage(data.message || 'Senha redefinida com sucesso.')

      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch {
      setError('Erro ao redefinir a senha')
    } finally {
      setSubmitting(false)
    }
  }

  const formattedExpiration = useMemo(() => {
    if (!expiresAt) return ''
    try {
      const date = new Date(expiresAt)
      return date.toLocaleString('pt-BR')
    } catch {
      return expiresAt
    }
  }, [expiresAt])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-white/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600 text-white rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Redefinir senha</h1>
            <p className="text-sm text-gray-600">
              Use o link recebido no WhatsApp para escolher uma nova senha.
            </p>
          </div>
        </div>

        {loadingVerify ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-6 w-6 rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <ShieldAlert className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {!error && (
              <div className="mb-4 rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-800">
                <p className="font-medium">Solicitacao validada</p>
                {email && <p className="mt-1 text-blue-700">Email: {email}</p>}
                {formattedExpiration && (
                  <p className="text-blue-700">Validade do token: {formattedExpiration}</p>
                )}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="new-password">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Digite a nova senha"
                  disabled={submitting || !!successMessage || !!error}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="confirm-password">
                  Confirme a nova senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Repita a nova senha"
                  disabled={submitting || !!successMessage || !!error}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || loadingVerify || !!error || !!successMessage}
                className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-blue-600 text-white font-medium py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" />
                    Salvando...
                  </>
                ) : (
                  'Salvar nova senha'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Lembrou a senha?{' '}
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => router.push('/login')}
              >
                Voltar para o login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
