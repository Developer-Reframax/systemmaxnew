'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { X, Heart, MessageCircle, Calendar, User, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ESTADOS_EMOCIONAL, type RegistroEmociogramaRequest } from '@/lib/types/emociograma'

interface ModalRegistroProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ModalRegistro({ isOpen, onClose, onSuccess }: ModalRegistroProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<keyof typeof ESTADOS_EMOCIONAL | ''>('')
  const [observacoes, setObservacoes] = useState('')
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedEmotion('')
      setObservacoes('')
      setShowAnimation(true)
      // Reset animation after a short delay
      const timer = setTimeout(() => setShowAnimation(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!selectedEmotion) {
      toast.error('Selecione como você está se sentindo hoje')
      return
    }

    if (!user?.matricula) {
      toast.error('Usuário não autenticado')
      return
    }

    setLoading(true)

    try {
      const requestData: RegistroEmociogramaRequest = {
        estado_emocional: selectedEmotion,
        observacoes: observacoes.trim() || undefined
      }

      const response = await fetch('/api/emociograma', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Emociograma registrado com sucesso! 🎉')
        onSuccess?.()
        onClose()
      } else {
        toast.error(data.error || 'Erro ao registrar emociograma')
      }
    } catch (error) {
      console.error('Error submitting emociograma:', error)
      toast.error('Erro ao registrar emociograma')
    } finally {
      setLoading(false)
    }
  }

  const handleEmotionSelect = (emotion: keyof typeof ESTADOS_EMOCIONAL) => {
    setSelectedEmotion(emotion)
    // Add a small animation effect
    const element = document.getElementById(`emotion-${emotion}`)
    if (element) {
      element.classList.add('animate-pulse')
      setTimeout(() => element.classList.remove('animate-pulse'), 200)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col transform transition-all duration-300 ${
        showAnimation ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Como você está hoje?</h2>
              <p className="text-sm text-gray-500">Registre seu estado emocional</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Emotion Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Selecione seu estado emocional
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(ESTADOS_EMOCIONAL).map(([key, estado]) => (
                <button
                  key={key}
                  id={`emotion-${key}`}
                  onClick={() => handleEmotionSelect(key as keyof typeof ESTADOS_EMOCIONAL)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                    selectedEmotion === key
                      ? `${estado.borderColor} ${estado.bgColor} shadow-lg`
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl ${selectedEmotion === key ? 'animate-bounce' : ''}`}>
                      {estado.emoji}
                    </div>
                    <div className="text-left flex-1">
                      <div className={`font-semibold text-lg ${
                        selectedEmotion === key ? estado.color : 'text-gray-900'
                      }`}>
                        {estado.label}
                      </div>
                      <div className={`text-sm ${
                        selectedEmotion === key ? estado.color : 'text-gray-500'
                      }`}>
                        {/* Descrição removida pois não existe na interface */}
                      </div>
                    </div>
                    {selectedEmotion === key && (
                      <CheckCircle className={`w-6 h-6 ${estado.color}`} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MessageCircle className="w-4 h-4" />
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Conte-nos mais sobre como você está se sentindo..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {observacoes.length}/500 caracteres
            </div>
          </div>

          {/* Warning for irregular states */}
          {selectedEmotion && ['regular', 'pessimo'].includes(selectedEmotion) && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">
                  Notamos que você não está se sentindo bem
                </p>
                <p className="text-amber-700 mt-1">
                  Sua liderança será notificada para oferecer o suporte necessário.
                </p>
              </div>
            </div>
          )}

          {/* User Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <User className="w-4 h-4" />
            <span>Registrado por: {user?.nome}</span>
            <Calendar className="w-4 h-4 ml-auto" />
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEmotion || loading}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
              selectedEmotion && !loading
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registrando...
              </div>
            ) : (
              'Registrar Emociograma'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
