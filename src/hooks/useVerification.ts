'use client'

import { useState, useCallback } from 'react'

interface UserVerificationStatus {
  termsAccepted: boolean
  hasRequiredData: boolean
  missingFields: string[]
  userData: {
    id: string
    nome: string
    email: string
    phone?: string
    letra_id?: string
    equipe_id?: string
    termos: boolean
  }
}

interface UserDataUpdate {
  phone?: string
  letra_id?: string
  equipe_id?: string
}

export function useVerification() {
  const [isLoading, setIsLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<UserVerificationStatus | null>(null)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)

  // Verificar status do usuário
  const checkVerificationStatus = useCallback(async (): Promise<UserVerificationStatus | null> => {
    setIsLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/users/verification', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao verificar status do usuário')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Erro na verificação')
      }

      const status: UserVerificationStatus = {
        termsAccepted: data.termsAccepted,
        hasRequiredData: data.hasRequiredData,
        missingFields: data.missingFields,
        userData: data.userData
      }

      setVerificationStatus(status)
      return status
    } catch (error) {
      console.error('Erro na verificação:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Aceitar termos
  const acceptTerms = useCallback(async (): Promise<boolean> => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/users/terms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ accepted: true })
      })

      if (!response.ok) {
        throw new Error('Erro ao aceitar termos')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Erro ao aceitar termos')
      }

      // Atualizar status local
      if (verificationStatus) {
        setVerificationStatus({
          ...verificationStatus,
          termsAccepted: true,
          userData: {
            ...verificationStatus.userData,
            termos: true
          }
        })
      }

      setShowTermsModal(false)
      return true
    } catch (error) {
      console.error('Erro ao aceitar termos:', error)
      return false
    }
  }, [verificationStatus])

  // Recusar termos (fazer logout)
  const declineTerms = useCallback(() => {
    // Limpar dados de autenticação
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    // Recarregar página para forçar redirect para login
    window.location.href = '/login'
  }, [])

  // Atualizar dados do usuário
  const updateUserData = useCallback(async (data: UserDataUpdate): Promise<boolean> => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/users/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar dados')
      }

      const responseData = await response.json()
      if (!responseData.success) {
        throw new Error(responseData.message || 'Erro ao atualizar dados')
      }

      // Atualizar status local
      if (verificationStatus) {
        const updatedUserData = {
          ...verificationStatus.userData,
          ...data
        }

        // Recalcular campos faltantes
        const missingFields: string[] = []
        if (!updatedUserData.phone) missingFields.push('phone')
        if (!updatedUserData.letra_id) missingFields.push('letra_id')
        if (!updatedUserData.equipe_id) missingFields.push('equipe_id')

        setVerificationStatus({
          ...verificationStatus,
          hasRequiredData: missingFields.length === 0,
          missingFields,
          userData: updatedUserData
        })
      }

      setShowDataModal(false)
      return true
    } catch (error) {
      console.error('Erro ao atualizar dados:', error)
      return false
    }
  }, [verificationStatus])

  // Iniciar processo de verificação
  const startVerification = useCallback(async (): Promise<boolean> => {
    console.log('startVerification: Iniciando verificação...')
    const status = await checkVerificationStatus()
    console.log('startVerification: Status recebido:', status)
    if (!status) return false

    // Se termos não foram aceitos, mostrar modal de termos
    if (!status.termsAccepted) {
      console.log('startVerification: Termos não aceitos, abrindo modal de termos')
      setShowTermsModal(true)
      return false
    }

    // VERIFICAÇÃO DE DADOS OBRIGATÓRIOS DESABILITADA
    // if (!status.hasRequiredData) {
    //   console.log('startVerification: Dados faltantes:', status.missingFields, 'abrindo modal de dados')
    //   setShowDataModal(true)
    //   return false
    // }

    // Tudo OK, usuário pode usar o sistema
    console.log('startVerification: Verificação completa, usuário pode usar o sistema')
    return true
  }, [checkVerificationStatus])

  // Verificar se verificação está completa
  const isVerificationComplete = useCallback((): boolean => {
    // Apenas verificar se os termos foram aceitos (dados obrigatórios desabilitados)
    return verificationStatus?.termsAccepted === true
  }, [verificationStatus])

  return {
    // Estados
    isLoading,
    verificationStatus,
    showTermsModal,
    showDataModal,
    
    // Ações
    checkVerificationStatus,
    startVerification,
    acceptTerms,
    declineTerms,
    updateUserData,
    isVerificationComplete,
    
    // Controles de modal
    setShowTermsModal,
    setShowDataModal
  }
}
