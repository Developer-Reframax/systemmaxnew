'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface NovoDesvioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormData {
  titulo: string
  descricao: string
  local: string
  data_ocorrencia: string
  natureza_id: string
  tipo_id: string
  gravidade: 'Baixa' | 'Média' | 'Alta' | 'Crítica'
  ver_agir: boolean
  observacoes: string
}

interface Natureza {
  id: string
  nome: string
  descricao: string
}

interface Tipo {
  id: string
  nome: string
  natureza_id: string
}

interface ImageFile {
  file: File
  preview: string
  categoria: 'antes' | 'durante' | 'depois'
}

const STEPS = [
  { id: 1, title: 'Informações Básicas', icon: FileText },
  { id: 2, title: 'Detalhes do Desvio', icon: AlertTriangle },
  { id: 3, title: 'Imagens', icon: Camera },
  { id: 4, title: 'Revisão', icon: CheckCircle }
]

export default function NovoDesvioModal({ isOpen, onClose, onSuccess }: NovoDesvioModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [naturezas, setNaturezas] = useState<Natureza[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [images, setImages] = useState<ImageFile[]>([])
  
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao: '',
    local: '',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    natureza_id: '',
    tipo_id: '',
    gravidade: 'Média',
    ver_agir: false,
    observacoes: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadNaturezas()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.natureza_id) {
      loadTipos(formData.natureza_id)
    } else {
      setTipos([])
      setFormData(prev => ({ ...prev, tipo_id: '' }))
    }
  }, [formData.natureza_id])

  const loadNaturezas = async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/security-params/natures', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNaturezas(data.data || [])
      }
    } catch (error) {
      console.error('Error loading naturezas:', error)
    }
  }

  const loadTipos = async (naturezaId: string) => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/security-params/types?nature_id=${naturezaId}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTipos(data.data || [])
      }
    } catch (error) {
      console.error('Error loading tipos:', error)
    }
  }

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, categoria: 'antes' | 'durante' | 'depois') => {
    const files = Array.from(event.target.files || [])
    
    // Verificar limite de 5 imagens por categoria
    const currentCategoryImages = images.filter(img => img.categoria === categoria)
    if (currentCategoryImages.length + files.length > 5) {
      toast.error(`Máximo de 5 imagens por categoria`)
      return
    }

    files.forEach(file => {
      // Verificar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande (máx. 5MB)`)
        return
      }

      // Verificar tipo
      if (!file.type.startsWith('image/')) {
        toast.error(`Arquivo ${file.name} não é uma imagem válida`)
        return
      }

      const preview = URL.createObjectURL(file)
      setImages(prev => [...prev, { file, preview, categoria }])
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.titulo && formData.descricao && formData.local && formData.data_ocorrencia)
      case 2:
        return !!(formData.natureza_id && formData.tipo_id && formData.gravidade)
      case 3:
        return true // Imagens são opcionais
      case 4:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
    } else {
      toast.error('Preencha todos os campos obrigatórios')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setLoading(true)
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Criar o desvio
      const desvioResponse = await fetch('/api/desvios', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!desvioResponse.ok) {
        throw new Error('Erro ao criar desvio')
      }

      const desvioData = await desvioResponse.json()
      const desvioId = desvioData.data.id

      // Upload das imagens se houver
      if (images.length > 0) {
        for (const image of images) {
          const imageFormData = new FormData()
          imageFormData.append('file', image.file)
          imageFormData.append('categoria', image.categoria)

          await fetch(`/api/desvios/${desvioId}/imagens`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${auth_token}`
            },
            body: imageFormData
          })
        }
      }

      toast.success('Desvio criado com sucesso!')
      onSuccess?.()
      onClose()
      
      // Reset form
      setFormData({
        titulo: '',
        descricao: '',
        local: '',
        data_ocorrencia: new Date().toISOString().split('T')[0],
        natureza_id: '',
        tipo_id: '',
        gravidade: 'Média',
        ver_agir: false,
        observacoes: ''
      })
      setImages([])
      setCurrentStep(1)
      
    } catch (error) {
      console.error('Error creating desvio:', error)
      toast.error('Erro ao criar desvio')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const currentStepData = STEPS.find(step => step.id === currentStep)
  const IconComponent = currentStepData?.icon || FileText

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <IconComponent className="h-6 w-6 text-orange-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Novo Relato de Desvio
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Passo {currentStep} de {STEPS.length}: {currentStepData?.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === currentStep
                const isCompleted = step.id < currentStep
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted ? 'bg-green-600 text-white' :
                      isActive ? 'bg-orange-600 text-white' :
                      'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-16 h-1 mx-2 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Título do Desvio *
                    </label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => handleInputChange('titulo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ex: Trabalhador sem EPI na obra"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Local da Ocorrência *
                    </label>
                    <input
                      type="text"
                      value={formData.local}
                      onChange={(e) => handleInputChange('local', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ex: Canteiro de obras - Bloco A"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data da Ocorrência *
                  </label>
                  <input
                    type="date"
                    value={formData.data_ocorrencia}
                    onChange={(e) => handleInputChange('data_ocorrencia', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição do Desvio *
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Descreva detalhadamente o que foi observado..."
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Natureza *
                    </label>
                    <select
                      value={formData.natureza_id}
                      onChange={(e) => handleInputChange('natureza_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Selecione a natureza</option>
                      {naturezas.map(natureza => (
                        <option key={natureza.id} value={natureza.id}>
                          {natureza.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tipo *
                    </label>
                    <select
                      value={formData.tipo_id}
                      onChange={(e) => handleInputChange('tipo_id', e.target.value)}
                      disabled={!formData.natureza_id}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Selecione o tipo</option>
                      {tipos.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gravidade *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Baixa', 'Média', 'Alta', 'Crítica'].map(gravidade => (
                      <button
                        key={gravidade}
                        type="button"
                        onClick={() => handleInputChange('gravidade', gravidade)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          formData.gravidade === gravidade
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {gravidade}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="ver_agir"
                    checked={formData.ver_agir}
                    onChange={(e) => handleInputChange('ver_agir', e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="ver_agir" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-orange-600" />
                      Ver & Agir (Requer ação imediata)
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observações Adicionais
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Informações complementares, medidas já tomadas, etc."
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Adicionar Imagens (Opcional)
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Máximo de 5 imagens por categoria • Formatos: JPG, PNG • Tamanho máximo: 5MB
                  </p>
                </div>

                {['antes', 'durante', 'depois'].map(categoria => {
                  const categoryImages = images.filter(img => img.categoria === categoria)
                  
                  return (
                    <div key={categoria} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                          {categoria === 'antes' ? 'Antes da Ocorrência' :
                           categoria === 'durante' ? 'Durante a Ocorrência' :
                           'Após Correção'}
                        </h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {categoryImages.length}/5
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {categoryImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.preview}
                              alt={`${categoria} ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeImage(images.indexOf(image))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {categoryImages.length < 5 && (
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                          <div className="text-center">
                            <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Adicionar imagem
                            </span>
                          </div>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, categoria as 'antes' | 'durante' | 'depois')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Revisar Informações
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Verifique todos os dados antes de enviar o relato
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Título:</span>
                      <p className="text-gray-900 dark:text-white">{formData.titulo}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Local:</span>
                      <p className="text-gray-900 dark:text-white">{formData.local}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Data:</span>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(formData.data_ocorrencia).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Gravidade:</span>
                      <p className="text-gray-900 dark:text-white">{formData.gravidade}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição:</span>
                    <p className="text-gray-900 dark:text-white">{formData.descricao}</p>
                  </div>
                  
                  {formData.ver_agir && (
                    <div className="flex items-center text-orange-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Ver & Agir - Requer ação imediata</span>
                    </div>
                  )}
                  
                  {images.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Imagens:</span>
                      <p className="text-gray-900 dark:text-white">
                        {images.length} imagem(ns) anexada(s)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </button>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Passo {currentStep} de {STEPS.length}
            </div>

            {currentStep < STEPS.length ? (
              <button
                onClick={nextStep}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enviar Relato
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
