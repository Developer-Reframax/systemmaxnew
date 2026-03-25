'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { X, Send, Camera, User, Bot, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface FormularioConversacionalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormData {
  descricao: string
  local: string
  data_ocorrencia: string
  natureza_id: string
  tipo_id: string
  potencial: string
  potencial_local: string
  contrato: string
  riscoassociado_id: string
  ver_agir: boolean
  gerou_recusa: boolean
  acao: string
}

interface Natureza {
  id: string
  natureza: string
}

interface Tipo {
  id: string
  tipo: string
  natureza_id?: string | number | null
  nature_id?: string | number | null
}

interface Local {
  id: string
  local: string
}

interface Potencial {
  id: string
  potencial_sede: string
  potencial_local: string
}

interface RiscoAssociado {
  id: string
  risco_associado: string
}

interface ImageFile {
  file: File
  preview: string
  categoria: 'evidencia'
}

interface Message {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface Question {
  id: string
  text: string
  field: keyof FormData | 'images' | ''
  type: 'text' | 'textarea' | 'select' | 'radio' | 'file' | 'date' | 'button'
  options?: { value: string; label: string }[]
  validation?: (value: unknown) => boolean
  required: boolean
  buttonText?: string
}

const TYPING_SPEED = 18
const PAUSE_BETWEEN_MESSAGES = 400
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_IMAGES = 5

function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0]
}

function createInitialFormData(contrato = ''): FormData {
  return {
    descricao: '',
    local: '',
    data_ocorrencia: '',
    natureza_id: '',
    tipo_id: '',
    potencial: '',
    potencial_local: '',
    contrato,
    riscoassociado_id: '',
    ver_agir: false,
    gerou_recusa: false,
    acao: ''
  }
}

function buildAutoTitle(descricao: string) {
  const normalized = descricao.replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Relato de desvio'
  return normalized.length > 100 ? `${normalized.slice(0, 97)}...` : normalized
}

export default function FormularioConversacional({
  isOpen,
  onClose,
  onSuccess
}: FormularioConversacionalProps) {
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [userInput, setUserInput] = useState('')

  const [naturezas, setNaturezas] = useState<Natureza[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [potenciais, setPotenciais] = useState<Potencial[]>([])
  const [riscosAssociados, setRiscosAssociados] = useState<RiscoAssociado[]>([])
  const [images, setImages] = useState<ImageFile[]>([])
  const [formData, setFormData] = useState<FormData>(() =>
    createInitialFormData(user?.contrato_raiz || '')
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<ImageFile[]>([])
  const finishConversationRef = useRef<() => Promise<void>>(async () => {})
  const messageIdCounterRef = useRef(0)

  const nextMessageId = useCallback(() => {
    const nextId = messageIdCounterRef.current
    messageIdCounterRef.current += 1
    return `msg-${nextId}-${Date.now()}`
  }, [])

  const questions = useMemo<Question[]>(
    () => [
      {
        id: 'greeting',
        text: `Olá, ${user?.nome || 'usuário'}! Vou te ajudar a registrar um novo desvio. Vamos começar?`,
        field: '',
        type: 'button',
        required: false,
        buttonText: 'Vamos começar!'
      },
      {
        id: 'descricao',
        text: 'Agora descreva detalhadamente o que aconteceu:',
        field: 'descricao',
        type: 'textarea',
        required: true,
        validation: (value) => typeof value === 'string' && value.trim().length >= 10
      },
      {
        id: 'local',
        text: 'Onde exatamente ocorreu este desvio?',
        field: 'local',
        type: 'select',
        required: true
      },
      {
        id: 'data_confirmacao',
        text: `A data da ocorrência é hoje (${new Date().toLocaleDateString('pt-BR')})?`,
        field: '',
        type: 'radio',
        options: [
          { value: 'sim', label: 'Sim, foi hoje' },
          { value: 'nao', label: 'Não, foi em outra data' }
        ],
        required: true
      },
      {
        id: 'data_ocorrencia',
        text: 'Informe a data em que o desvio ocorreu:',
        field: 'data_ocorrencia',
        type: 'date',
        required: true,
        validation: (value) => {
          if (typeof value !== 'string' || !value) return false
          const chosenDate = new Date(`${value}T00:00:00`)
          const today = new Date(`${getTodayIsoDate()}T00:00:00`)
          return !Number.isNaN(chosenDate.getTime()) && chosenDate <= today
        }
      },
      {
        id: 'natureza',
        text: 'Qual é a natureza deste desvio?',
        field: 'natureza_id',
        type: 'select',
        required: true
      },
      {
        id: 'tipo',
        text: 'Agora me diga qual é o tipo específico:',
        field: 'tipo_id',
        type: 'select',
        required: true
      },
      {
        id: 'potencial',
        text: 'Qual é o potencial de risco deste desvio?',
        field: 'potencial_local',
        type: 'select',
        required: true
      },
      {
        id: 'risco_associado',
        text: 'Qual é o risco associado ao desvio?',
        field: 'riscoassociado_id',
        type: 'select',
        required: true
      },
      {
        id: 'ver_agir',
        text: 'Este desvio foi resolvido de forma imediata (Ver & Agir)?',
        field: 'ver_agir',
        type: 'radio',
        options: [
          { value: 'true', label: 'Sim, foi resolvido imediatamente' },
          { value: 'false', label: 'Não, deve passar pelo processo padrão' }
        ],
        required: true
      },
      {
        id: 'acao_ver_agir',
        text: 'Qual ação foi realizada?',
        field: 'acao',
        type: 'textarea',
        required: true,
        validation: (value) => typeof value === 'string' && value.trim().length >= 5
      },
      {
        id: 'gerou_recusa',
        text: 'Este desvio gerou alguma recusa?',
        field: 'gerou_recusa',
        type: 'radio',
        options: [
          { value: 'true', label: 'Sim, gerou recusa' },
          { value: 'false', label: 'Não, não gerou recusa' }
        ],
        required: true
      },
      {
        id: 'images',
        text: 'Por último, você tem alguma imagem para anexar? (Opcional)',
        field: 'images',
        type: 'file',
        required: false
      }
    ],
    [user?.nome]
  )

  const currentQuestion = questions[currentQuestionIndex]

  const availableTipos = useMemo(() => {
    if (!formData.natureza_id) return tipos

    const filtered = tipos.filter((tipo) => {
      const naturezaVinculada = tipo.natureza_id ?? tipo.nature_id
      if (naturezaVinculada === undefined || naturezaVinculada === null) return false
      return String(naturezaVinculada) === formData.natureza_id
    })

    return filtered.length > 0 ? filtered : tipos
  }, [formData.natureza_id, tipos])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const revokeImagePreviews = useCallback((currentImages: ImageFile[]) => {
    currentImages.forEach((image) => {
      if (image.preview.startsWith('blob:')) {
        URL.revokeObjectURL(image.preview)
      }
    })
  }, [])

  const resetForm = useCallback(() => {
    setMessages([])
    setCurrentQuestionIndex(0)
    setIsTyping(false)
    setLoading(false)
    setShowInput(false)
    setUserInput('')
    messageIdCounterRef.current = 0
    setFormData(createInitialFormData(user?.contrato_raiz || ''))
    setImages((prev) => {
      revokeImagePreviews(prev)
      return []
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [revokeImagePreviews, user?.contrato_raiz])

  const addUserMessage = useCallback(
    (content: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          type: 'user',
          content,
          timestamp: new Date()
        }
      ])
    },
    [nextMessageId]
  )

  const typeMessage = useCallback(
    async (text: string, type: 'bot' | 'user', callback?: () => void) => {
      setIsTyping(true)

      const messageId = nextMessageId()
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          type,
          content: '',
          timestamp: new Date(),
          isTyping: type === 'bot'
        }
      ])

      for (let index = 0; index <= text.length; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, TYPING_SPEED))
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId ? { ...message, content: text.slice(0, index) } : message
          )
        )
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, isTyping: false } : message
        )
      )

      setIsTyping(false)
      if (callback) {
        setTimeout(callback, 250)
      }
    },
    [nextMessageId]
  )

  const askQuestion = useCallback(
    (questionIndex: number) => {
      const nextQuestion = questions[questionIndex]
      if (!nextQuestion) return

      setCurrentQuestionIndex(questionIndex)
      setTimeout(() => {
        void typeMessage(nextQuestion.text, 'bot', () => {
          setShowInput(true)
          scrollToBottom()
        })
      }, PAUSE_BETWEEN_MESSAGES)
    },
    [questions, scrollToBottom, typeMessage]
  )

  const startConversation = useCallback(() => {
    setMessages([])
    setCurrentQuestionIndex(0)
    setShowInput(false)
    setTimeout(() => {
      void typeMessage(questions[0].text, 'bot', () => {
        setShowInput(true)
        scrollToBottom()
      })
    }, PAUSE_BETWEEN_MESSAGES)
  }, [questions, scrollToBottom, typeMessage])

  const loadNaturezas = useCallback(async () => {
    const contrato = user?.contrato_raiz
    if (!contrato) return

    try {
      const response = await fetch(
        `/api/security-params/natures?contrato=${encodeURIComponent(contrato)}&limit=500`,
        { method: 'GET' }
      )
      if (!response.ok) throw new Error('Erro ao carregar naturezas')
      const data = await response.json()
      setNaturezas(data.data || [])
    } catch (error) {
      console.error('Error loading naturezas:', error)
      toast.error('Erro ao carregar naturezas')
    }
  }, [user?.contrato_raiz])

  const loadTipos = useCallback(async () => {
    const contrato = user?.contrato_raiz
    if (!contrato) return

    const params = new URLSearchParams({
      contrato,
      limit: '500'
    })

    if (formData.natureza_id) {
      params.set('nature_id', formData.natureza_id)
    }

    try {
      const response = await fetch(`/api/security-params/types?${params.toString()}`, {
        method: 'GET'
      })
      if (!response.ok) throw new Error('Erro ao carregar tipos')
      const data = await response.json()
      setTipos(data.data || [])
    } catch (error) {
      console.error('Error loading tipos:', error)
      toast.error('Erro ao carregar tipos')
    }
  }, [formData.natureza_id, user?.contrato_raiz])

  const loadLocais = useCallback(async () => {
    const contrato = user?.contrato_raiz
    if (!contrato) return

    try {
      const response = await fetch(
        `/api/security-params/locations?contrato=${encodeURIComponent(contrato)}&limit=500`,
        { method: 'GET' }
      )
      if (!response.ok) throw new Error('Erro ao carregar locais')
      const data = await response.json()
      setLocais(data.data || [])
    } catch (error) {
      console.error('Error loading locais:', error)
      toast.error('Erro ao carregar locais')
    }
  }, [user?.contrato_raiz])

  const loadPotenciais = useCallback(async () => {
    const contrato = user?.contrato_raiz
    if (!contrato) return

    try {
      const response = await fetch(
        `/api/security-params/potentials?contrato=${encodeURIComponent(contrato)}`,
        { method: 'GET' }
      )
      if (!response.ok) throw new Error('Erro ao carregar potenciais')
      const data = await response.json()
      setPotenciais(data.data || [])
    } catch (error) {
      console.error('Error loading potenciais:', error)
      toast.error('Erro ao carregar potenciais')
    }
  }, [user?.contrato_raiz])

  const loadRiscosAssociados = useCallback(async () => {
    try {
      const response = await fetch('/api/security-params/associated-risks', {
        method: 'GET'
      })
      if (!response.ok) throw new Error('Erro ao carregar riscos associados')
      const data = await response.json()
      setRiscosAssociados(data.data || [])
    } catch (error) {
      console.error('Error loading riscos associados:', error)
      toast.error('Erro ao carregar riscos associados')
    }
  }, [])

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!isOpen) return undefined

    resetForm()
    void loadNaturezas()
    void loadLocais()
    void loadPotenciais()
    void loadRiscosAssociados()
    startConversation()

    return () => {
      setShowInput(false)
    }
  }, [
    isOpen,
    loadLocais,
    loadNaturezas,
    loadPotenciais,
    loadRiscosAssociados,
    resetForm,
    startConversation
  ])

  useEffect(() => {
    if (!isOpen) return
    void loadTipos()
  }, [formData.natureza_id, isOpen, loadTipos])

  useEffect(() => {
    scrollToBottom()
  }, [loading, messages, scrollToBottom, showInput])

  useEffect(() => {
    return () => {
      revokeImagePreviews(imagesRef.current)
    }
  }, [revokeImagePreviews])

  const getDisplayValue = useCallback(
    (question: Question, value: string | number | boolean) => {
      const rawValue = String(value)

      if (question.id === 'data_ocorrencia') {
        return new Date(`${rawValue}T00:00:00`).toLocaleDateString('pt-BR')
      }

      if (question.field === 'natureza_id') {
        return naturezas.find((item) => String(item.id) === rawValue)?.natureza || rawValue
      }

      if (question.field === 'tipo_id') {
        return availableTipos.find((item) => String(item.id) === rawValue)?.tipo || rawValue
      }

      if (question.field === 'riscoassociado_id') {
        return (
          riscosAssociados.find((item) => String(item.id) === rawValue)?.risco_associado ||
          rawValue
        )
      }

      if (question.field === 'potencial_local') {
        return (
          potenciais.find((item) => item.potencial_local === rawValue)?.potencial_local || rawValue
        )
      }

      if (question.options?.length) {
        return question.options.find((option) => option.value === rawValue)?.label || rawValue
      }

      return rawValue
    },
    [availableTipos, naturezas, potenciais, riscosAssociados]
  )

  const getNextQuestionIndex = useCallback(
    (questionIndex: number, value: string | number | boolean) => {
      const question = questions[questionIndex]
      if (!question) return questionIndex + 1

      if (question.id === 'data_confirmacao') {
        return value === 'sim' ? questionIndex + 2 : questionIndex + 1
      }

      if (question.id === 'ver_agir') {
        return value === 'true' || value === true ? questionIndex + 1 : questionIndex + 2
      }

      return questionIndex + 1
    },
    [questions]
  )

  const handleUserResponse = useCallback(
    async (value: string | number | boolean) => {
      if (!currentQuestion || isTyping || loading) return

      if (
        currentQuestion.required &&
        ((typeof value === 'string' && !value.trim()) || value === null || value === undefined)
      ) {
        toast.error('Esta informação é obrigatória')
        return
      }

      if (currentQuestion.validation && !currentQuestion.validation(value)) {
        if (currentQuestion.id === 'data_ocorrencia') {
          toast.error('Informe uma data válida que não seja futura')
        } else {
          toast.error('Por favor, forneça uma resposta válida')
        }
        return
      }

      addUserMessage(getDisplayValue(currentQuestion, value))
      setShowInput(false)
      setUserInput('')

      setFormData((prev) => {
        const nextData = { ...prev }

        switch (currentQuestion.id) {
          case 'data_confirmacao':
            nextData.data_ocorrencia = value === 'sim' ? getTodayIsoDate() : ''
            break
          case 'data_ocorrencia':
            nextData.data_ocorrencia = String(value)
            break
          case 'ver_agir':
            nextData.ver_agir = value === 'true' || value === true
            if (!nextData.ver_agir) {
              nextData.acao = ''
            }
            break
          case 'gerou_recusa':
            nextData.gerou_recusa = value === 'true' || value === true
            break
          case 'potencial': {
            const potencialSelecionado = potenciais.find(
              (item) => item.potencial_local === String(value)
            )
            if (potencialSelecionado) {
              nextData.potencial_local = potencialSelecionado.potencial_local
              nextData.potencial = potencialSelecionado.potencial_sede
            }
            break
          }
          case 'natureza':
            nextData.natureza_id = String(value)
            nextData.tipo_id = ''
            break
          default:
            if (currentQuestion.field !== 'images' && currentQuestion.field !== '') {
              nextData[currentQuestion.field as keyof FormData] = String(value) as never
            }
            break
        }

        return nextData
      })

      const nextIndex = getNextQuestionIndex(currentQuestionIndex, value)
      setTimeout(() => {
        if (nextIndex < questions.length) {
          askQuestion(nextIndex)
        } else {
          void finishConversationRef.current()
        }
      }, PAUSE_BETWEEN_MESSAGES)
    },
    [
      addUserMessage,
      askQuestion,
      currentQuestion,
      currentQuestionIndex,
      getDisplayValue,
      getNextQuestionIndex,
      isTyping,
      loading,
      potenciais,
      questions.length
    ]
  )

  const uploadImagesForDesvio = useCallback(
    async (desvioId: string) => {
      const uploadedImages: string[] = []
      const failedImages: string[] = []

      for (const image of images) {
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('file', image.file)

          const uploadResponse = await fetch('/api/desvios/upload-image', {
            method: 'POST',
            body: uploadFormData
          })

          if (!uploadResponse.ok) {
            throw new Error(image.file.name)
          }

          const uploadResult = await uploadResponse.json()
          if (!uploadResult.success) {
            throw new Error(image.file.name)
          }

          const imageRegisterResponse = await fetch('/api/desvios/imagens', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              desvio_id: desvioId,
              url: uploadResult.data.publicUrl,
              categoria: image.categoria,
              nome_arquivo: uploadResult.data.fileName || image.file.name,
              tamanho: image.file.size,
              tipo_mime: image.file.type
            })
          })

          if (!imageRegisterResponse.ok) {
            throw new Error(image.file.name)
          }

          uploadedImages.push(image.file.name)
        } catch (error) {
          console.error('Erro ao processar imagem:', image.file.name, error)
          failedImages.push(image.file.name)
        }
      }

      return { uploadedImages, failedImages }
    },
    [images]
  )

  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true)

      const payload = {
        titulo: buildAutoTitle(formData.descricao),
        descricao: formData.descricao.trim(),
        local: formData.local,
        data_ocorrencia: formData.data_ocorrencia || getTodayIsoDate(),
        natureza_id: formData.natureza_id,
        tipo_id: formData.tipo_id,
        potencial: formData.potencial,
        potencial_local: formData.potencial_local,
        contrato: user?.contrato_raiz || formData.contrato,
        riscoassociado_id: formData.riscoassociado_id,
        ver_agir: formData.ver_agir,
        gerou_recusa: formData.gerou_recusa,
        acao: formData.ver_agir ? formData.acao.trim() : null
      }

      const response = await fetch('/api/desvios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(result.message || 'Erro ao criar desvio')
      }

      let finalMessage = 'Relato criado com sucesso! Obrigado por contribuir com a segurança.'

      if (images.length > 0) {
        const { uploadedImages, failedImages } = await uploadImagesForDesvio(result.data.id)

        if (failedImages.length > 0) {
          finalMessage =
            uploadedImages.length > 0
              ? `Relato criado com sucesso. ${uploadedImages.length} imagem(ns) enviada(s) e ${failedImages.length} falharam.`
              : 'Relato criado com sucesso, mas não foi possível enviar as imagens.'
          toast.warning(finalMessage)
        } else {
          finalMessage = `Relato criado com sucesso com ${uploadedImages.length} imagem(ns) anexada(s).`
          toast.success(finalMessage)
        }
      } else {
        toast.success('Relato criado com sucesso!')
      }

      await typeMessage(finalMessage, 'bot', () => {
        setTimeout(() => {
          resetForm()
          onSuccess?.()
          onClose()
        }, 1200)
      })
    } catch (error) {
      console.error('Error creating desvio:', error)
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Ops! Ocorreu um erro ao criar o relato. Tente novamente.'
      await typeMessage(errorMessage, 'bot')
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [
    formData,
    images.length,
    onClose,
    onSuccess,
    resetForm,
    typeMessage,
    uploadImagesForDesvio,
    user?.contrato_raiz
  ])

  const finishConversation = useCallback(async () => {
    await typeMessage('Perfeito! Vou finalizar o registro do relato agora.', 'bot', () => {
      setTimeout(() => {
        void handleSubmit()
      }, 500)
    })
  }, [handleSubmit, typeMessage])

  useEffect(() => {
    finishConversationRef.current = finishConversation
  }, [finishConversation])

  const removeImage = useCallback((indexToRemove: number) => {
    setImages((prev) => {
      const nextImages = [...prev]
      const removed = nextImages[indexToRemove]
      if (removed?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview)
      }
      nextImages.splice(indexToRemove, 1)
      return nextImages
    })
  }, [])

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setImages((prev) => {
      const nextImages = [...prev]

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Arquivo ${file.name} não é uma imagem válida`)
          continue
        }

        if (file.size > MAX_IMAGE_SIZE) {
          toast.error(`Arquivo ${file.name} é muito grande (máx. 5MB)`)
          continue
        }

        if (nextImages.length >= MAX_IMAGES) {
          toast.error(`Máximo de ${MAX_IMAGES} imagens por relato`)
          break
        }

        nextImages.push({
          file,
          preview: URL.createObjectURL(file),
          categoria: 'evidencia'
        })
      }

      return nextImages
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const renderInput = () => {
    if (!showInput || !currentQuestion) return null

    switch (currentQuestion.type) {
      case 'textarea':
        return (
          <div className="flex items-end space-x-2">
            <textarea
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={3}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleUserResponse(userInput)
                }
              }}
            />
            <button
              onClick={() => void handleUserResponse(userInput)}
              disabled={!userInput.trim()}
              className="rounded-lg bg-orange-600 px-4 py-3 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )

      case 'date':
        return (
          <div className="flex items-end space-x-2">
            <input
              type="date"
              value={userInput}
              max={getTodayIsoDate()}
              onChange={(event) => setUserInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && userInput) {
                  event.preventDefault()
                  void handleUserResponse(userInput)
                }
              }}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={() => void handleUserResponse(userInput)}
              disabled={!userInput}
              className="rounded-lg bg-orange-600 px-4 py-3 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )

      case 'select': {
        const options =
          currentQuestion.field === 'natureza_id'
            ? naturezas.map((natureza) => ({ value: natureza.id, label: natureza.natureza }))
            : currentQuestion.field === 'tipo_id'
              ? availableTipos.map((tipo) => ({ value: tipo.id, label: tipo.tipo }))
              : currentQuestion.field === 'local'
                ? locais.map((local) => ({ value: local.local, label: local.local }))
                : currentQuestion.field === 'potencial_local'
                  ? potenciais.map((potencial) => ({
                      value: potencial.potencial_local,
                      label: potencial.potencial_local
                    }))
                  : currentQuestion.field === 'riscoassociado_id'
                    ? riscosAssociados.map((risco) => ({
                        value: risco.id,
                        label: risco.risco_associado
                      }))
                    : []

        const sortedOptions =
          currentQuestion.field === 'local'
            ? [...options].sort((a, b) =>
                a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
              )
            : options

        if (sortedOptions.length === 0) {
          return (
            <div className="py-4 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {currentQuestion.field === 'tipo_id' && formData.natureza_id
                  ? 'Nenhum tipo disponível para a natureza selecionada.'
                  : 'Carregando opções...'}
              </p>
            </div>
          )
        }

        if (currentQuestion.field === 'local' || currentQuestion.field === 'riscoassociado_id') {
          return (
            <select
              key={currentQuestion.id}
              defaultValue=""
              onChange={(event) => {
                if (event.target.value) {
                  void handleUserResponse(event.target.value)
                }
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="" disabled>
                {currentQuestion.field === 'local'
                  ? 'Selecione o local...'
                  : 'Selecione o risco associado...'}
              </option>
              {sortedOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )
        }

        return (
          <div className="space-y-2">
            {sortedOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => void handleUserResponse(option.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                {option.label}
              </button>
            ))}
          </div>
        )
      }

      case 'radio':
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => void handleUserResponse(option.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                {option.label}
              </button>
            ))}
          </div>
        )

      case 'file':
        return (
          <div className="space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-orange-500 dark:border-gray-600"
            >
              <div className="text-center">
                <Camera className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Clique para adicionar imagens
                </span>
              </div>
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={`${image.file.name}-${index}`} className="group relative">
                    <img
                      src={image.preview}
                      alt={`Imagem ${index + 1}`}
                      className="h-20 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() =>
                void handleUserResponse(
                  images.length > 0
                    ? `${images.length} imagem(ns) selecionada(s)`
                    : 'Nenhuma imagem'
                )
              }
              className="w-full rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
            >
              {images.length > 0 ? 'Continuar com imagens' : 'Pular imagens'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )

      case 'button':
        return (
          <div className="flex justify-center">
            <button
              onClick={() => void handleUserResponse('continue')}
              className="rounded-lg bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-700"
            >
              {currentQuestion.buttonText || 'Continuar'}
            </button>
          </div>
        )

      default:
        return (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleUserResponse(userInput)
                }
              }}
            />
            <button
              onClick={() => void handleUserResponse(userInput)}
              disabled={!userInput.trim()}
              className="rounded-lg bg-orange-600 px-4 py-3 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )
    }
  }

  const handleModalClose = () => {
    if (loading) return
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={handleModalClose} />

      <div className="relative flex h-full w-full items-center justify-center p-4">
        <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-600">
            <div className="flex items-center">
              <Bot className="mr-3 h-6 w-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Assistente de Relatos
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Vou te ajudar a registrar o desvio passo a passo
                </p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.type === 'user'
                      ? 'rounded-br-md bg-orange-600 text-white'
                      : 'rounded-bl-md bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        message.type === 'user'
                          ? 'bg-orange-500/30 text-white'
                          : 'bg-white text-orange-600 dark:bg-gray-800'
                      }`}
                    >
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {message.content || (message.isTyping ? '...' : '')}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {(loading || isTyping) && !showInput && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loading ? 'Finalizando registro...' : 'Digitando...'}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-6 dark:border-gray-600">
            {renderInput()}
          </div>
        </div>
      </div>
    </div>
  )
}
