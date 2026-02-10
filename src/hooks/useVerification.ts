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

  const checkVerificationStatus = useCallback(async (): Promise<UserVerificationStatus | null> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/verification')

      if (!response.ok) {
        throw new Error('Erro ao verificar status do usuÇ­rio')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Erro na verificaÇõÇœo')
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
      console.error('Erro na verificaÇõÇœo:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const acceptTerms = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/users/terms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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

  const declineTerms = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    window.location.href = '/login'
  }, [])

  const updateUserData = useCallback(async (data: UserDataUpdate): Promise<boolean> => {
    try {
      const response = await fetch('/api/users/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
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

      if (verificationStatus) {
        const updatedUserData = {
          ...verificationStatus.userData,
          ...data
        }

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

  const startVerification = useCallback(async (): Promise<boolean> => {
    const status = await checkVerificationStatus()
    if (!status) return false

    if (!status.termsAccepted) {
      setShowTermsModal(true)
      return false
    }

    return true
  }, [checkVerificationStatus])

  const isVerificationComplete = useCallback((): boolean => {
    return verificationStatus?.termsAccepted === true
  }, [verificationStatus])

  return {
    isLoading,
    verificationStatus,
    showTermsModal,
    showDataModal,
    checkVerificationStatus,
    startVerification,
    acceptTerms,
    declineTerms,
    updateUserData,
    isVerificationComplete,
    setShowTermsModal,
    setShowDataModal
  }
}
