'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'

interface UserDataModalProps {
  isOpen: boolean
  missingFields: string[]
  onComplete: (data: UserDataUpdate) => void
  userContractCode: string
}

interface UserDataUpdate {
  phone?: string
  letra_id?: string
  equipe_id?: string
}

interface Letter {
  id: string
  letra: string
  lider: string
}

interface Team {
  id: string
  equipe: string
  supervisor: string
}

export default function UserDataModal({ 
  isOpen, 
  missingFields, 
  onComplete, 
  userContractCode 
}: UserDataModalProps) {
  const [formData, setFormData] = useState<UserDataUpdate>({})
  const [letters, setLetters] = useState<Letter[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar letras e equipes quando o modal abrir
 

  const loadLettersAndTeams = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    
    if (!userContractCode || !token) {
      return
    }
    

    setLoading(true)
    try {
      // Buscar letras
      const lettersResponse = await fetch(`/api/letters?contrato=${userContractCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (lettersResponse.ok) {
        const lettersData = await lettersResponse.json()
        setLetters(lettersData)
      }

      // Buscar equipes
      const teamsResponse = await fetch(`/api/teams?contrato=${userContractCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        setTeams(teamsData)
      }
    } catch {
      // Erro silencioso - não exibir logs
    } finally {
      setLoading(false)
    }
  }, [userContractCode])

   useEffect(() => {
    if (isOpen && userContractCode) {
      loadLettersAndTeams()
    }
  }, [isOpen, userContractCode, loadLettersAndTeams])

  const handleInputChange = (field: keyof UserDataUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (missingFields.includes('phone') && !formData.phone?.trim()) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (formData.phone && !/^\([0-9]{2}\)\s[0-9]{4,5}-[0-9]{4}$/.test(formData.phone)) {
      newErrors.phone = 'Formato inválido. Use: (11) 99999-9999'
    }

    if (missingFields.includes('letra_id') && !formData.letra_id) {
      newErrors.letra_id = 'Letra é obrigatória'
    }

    if (missingFields.includes('equipe_id') && !formData.equipe_id) {
      newErrors.equipe_id = 'Equipe é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setSubmitting(true)
    try {
      await onComplete(formData)
    } catch{
      // Erro silencioso - não exibir logs
    } finally {
      setSubmitting(false)
    }
  }

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Aplica a máscara (11) 99999-9999
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    handleInputChange('phone', formatted)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Dados Obrigatórios</h2>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Para continuar usando o sistema, você precisa preencher os seguintes dados:
          </p>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
              <span className="ml-2 text-gray-600">Carregando opções...</span>
            </div>
          )}

          {/* Campo Telefone */}
          {missingFields.includes('phone') && (
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone *
              </label>
              <input
                type="text"
                id="phone"
                value={formData.phone || ''}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={15}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
          )}

          {/* Campo Letra */}
          {missingFields.includes('letra_id') && (
            <div>
              <label htmlFor="letra_id" className="block text-sm font-medium text-gray-700 mb-1">
                Letra *
              </label>
              <select
                id="letra_id"
                value={formData.letra_id || ''}
                onChange={(e) => handleInputChange('letra_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.letra_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Selecione uma letra</option>
                {letters.map((letter) => (
                  <option key={letter.id} value={letter.id}>
                    {letter.letra} - Líder: {letter.lider}
                  </option>
                ))}
              </select>
              {errors.letra_id && (
                <p className="text-red-500 text-xs mt-1">{errors.letra_id}</p>
              )}
            </div>
          )}

          {/* Campo Equipe */}
          {missingFields.includes('equipe_id') && (
            <div>
              <label htmlFor="equipe_id" className="block text-sm font-medium text-gray-700 mb-1">
                Equipe *
              </label>
              <select
                id="equipe_id"
                value={formData.equipe_id || ''}
                onChange={(e) => handleInputChange('equipe_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.equipe_id ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="">Selecione uma equipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.equipe} - Supervisor: {team.supervisor}
                  </option>
                ))}
              </select>
              {errors.equipe_id && (
                <p className="text-red-500 text-xs mt-1">{errors.equipe_id}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              Salvar Dados
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
