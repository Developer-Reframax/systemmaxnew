'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  X,
  Send,
  Camera,
  User,
  Bot,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
// Removido cliente Supabase direto - usando API route protegida

interface FormularioConversacionalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface FormData {
  descricao: string
  local: string
  natureza_id: string
  tipo_id: string
  potencial: string
  potencial_local: string
  contrato: string
  riscoassociado_id: string
  ver_agir: boolean
  gerou_recusa: boolean
}

interface Natureza {
  id: string
  natureza: string
  contrato: string
  created_at: string
  updated_at: string

}

interface RiscoAssociado {
  id: string
  risco_associado: string
  descricao?: string
  categoria?: string
  created_at: string
  updated_at: string
}

interface Potenciais {
  id: string
  potencial_sede: string
  potencial_local: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Tipo {
  id: string
  tipo: string
  contrato: string
  created_at: string
  updated_at: string
}

interface Local {
  id: string
  local: string
  contrato: string
  created_at: string
  updated_at: string
}

interface ImageFile {
  file: File
  preview: string
  categoria: 'desvio' | 'evidencia'
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
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date' | 'button'
  options?: { value: string; label: string }[]
  validation?: (value: unknown) => boolean
  required: boolean
  buttonText?: string
}

const TYPING_SPEED = 20
const PAUSE_BETWEEN_MESSAGES = 500

export default function FormularioConversacional({ isOpen, onClose, onSuccess }: FormularioConversacionalProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [naturezas, setNaturezas] = useState<Natureza[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [locais, setLocais] = useState<Local[]>([])
  const [potenciais, setPotenciais] = useState<Potenciais[]>([])
  const [riscosAssociados, setRiscosAssociados] = useState<RiscoAssociado[]>([])
  const [images, setImages] = useState<ImageFile[]>([])  
  const [desvioId, setDesvioId] = useState<string | null>(null) // 🆔 ID do desvio cadastrado
  
  // 💾 SISTEMA DE BACKUP DAS IMAGENS EM LOCALSTORAGE
  const BACKUP_KEY = 'desvio_images_backup'
  
  const saveImagesToBackup = useCallback((imagesToSave: ImageFile[]) => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        images: imagesToSave.map(img => ({
          fileName: img.file.name,
          fileSize: img.file.size,
          fileType: img.file.type,
          preview: img.preview,
          categoria: img.categoria,
          // Não salvamos o File object pois não é serializável
        }))
      }
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData))
      console.log('💾 ✅ BACKUP SALVO:', {
        quantidade: imagesToSave.length,
        timestamp: backupData.timestamp
      })
    } catch (error) {
      console.error('💾 ❌ Erro ao salvar backup:', error)
    }
  }, [])
  

  
  const clearImagesBackup = () => {
    try {
      localStorage.removeItem(BACKUP_KEY)
      console.log('💾 🧹 BACKUP LIMPO')
    } catch (error) {
      console.error('💾 ❌ Erro ao limpar backup:', error)
    }
  }

  // 🔍 WRAPPER PARA DETECTAR MUDANÇAS NO ESTADO DAS IMAGENS COM BACKUP
  const setImagesWithLog = useCallback((newImages: ImageFile[] | ((prev: ImageFile[]) => ImageFile[])) => {
    console.log('🔍 ===== SETIMAGES CHAMADO =====', {
      timestamp: new Date().toISOString(),
      tipoParametro: typeof newImages === 'function' ? 'function' : 'array',
      estadoAtual: images.length,
      stackTrace: new Error().stack?.split('\n').slice(1, 5)
    })
    
    if (typeof newImages === 'function') {
      setImages(prev => {
        const resultado = newImages(prev)
        console.log('🔍 ✅ SETIMAGES EXECUTADO (FUNCTION):', {
          estadoAnterior: prev.length,
          novoEstado: resultado.length,
          diferenca: resultado.length - prev.length
        })
        
        // 💾 BACKUP AUTOMÁTICO APÓS MUDANÇA
        if (resultado.length > 0) {
          saveImagesToBackup(resultado)
        } else if (prev.length > 0) {
          // Se estava com imagens e agora está vazio, manter backup por segurança
          console.log('⚠️ IMAGENS FORAM LIMPAS - MANTENDO BACKUP POR SEGURANÇA')
        }
        
        return resultado
      })
    } else {
      console.log('🔍 ✅ SETIMAGES EXECUTADO (ARRAY):', {
        estadoAnterior: images.length,
        novoEstado: newImages.length,
        diferenca: newImages.length - images.length
      })
      
      // 💾 BACKUP AUTOMÁTICO APÓS MUDANÇA
      if (newImages.length > 0) {
        saveImagesToBackup(newImages)
      } else if (images.length > 0) {
        // Se estava com imagens e agora está vazio, manter backup por segurança
        console.log('⚠️ IMAGENS FORAM LIMPAS - MANTENDO BACKUP POR SEGURANÇA')
      }
      
      setImages(newImages)
    }
  }, [images, saveImagesToBackup])
  
  // 🛡️ VERIFICAÇÃO DE INTEGRIDADE DAS IMAGENS
  const checkImageIntegrity = useCallback(() => {
    const backupStr = typeof window !== 'undefined' ? localStorage.getItem(BACKUP_KEY) : null
    if (!backupStr) return
    
    try {
      const backupData = JSON.parse(backupStr)
      const backupCount = backupData.images?.length || 0
      const currentCount = images.length
      
      if (backupCount > 0 && currentCount === 0) {
        console.log('🚨 PERDA DE IMAGENS DETECTADA!', {
          imagensNoBackup: backupCount,
          imagensAtuais: currentCount,
          timestampBackup: backupData.timestamp,
          detalhesBackup: backupData.images.map((img: unknown) => {
            const imageObj = img as { fileName: string; fileSize: number; categoria: string };
            return {
              fileName: imageObj.fileName,
              fileSize: imageObj.fileSize,
              categoria: imageObj.categoria
            };
          })
        })
        
        // Alertar sobre a perda
        console.error('🚨 CRÍTICO: Imagens foram perdidas durante o processo!')
      }
    } catch (error) {
      console.error('🛡️ Erro na verificação de integridade:', error)
    }
  }, [images.length])

  // 🆔 FUNÇÃO PARA CADASTRAR O DESVIO ANTECIPADAMENTE
  const cadastrarDesvioAntecipado = async () => {
    try {
      
      const desvioData = {
        descricao: formData.descricao,
        local: formData.local,
        data_ocorrencia: new Date().toISOString().split('T')[0],
        natureza_id: parseInt(formData.natureza_id),
        tipo_id: parseInt(formData.tipo_id),
        potencial: formData.potencial,
        potencial_local: formData.potencial_local,
        contrato: formData.contrato,
        riscoassociado_id: parseInt(formData.riscoassociado_id),
        ver_agir: formData.ver_agir,
        gerou_recusa: formData.gerou_recusa
      }
      
      console.log('🆔 Cadastrando desvio antecipadamente:', desvioData)
      
      const response = await fetch('/api/desvios', {
        method: 'POST',
        body: JSON.stringify(desvioData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Erro ao cadastrar desvio: ${errorData.message || response.statusText}`)
      }
      
      const result = await response.json()
      console.log('✅ Desvio cadastrado com sucesso! ID:', result.data.id)
      
      // Armazenar o ID do desvio
      setDesvioId(result.data.id)
      
      return result.data.id
    } catch (error) {
      console.error('❌ Erro ao cadastrar desvio antecipadamente:', error)
      throw error
    }
  }
  const [userInput, setUserInput] = useState('')
  const [showInput, setShowInput] = useState(false)

  const [messageIdCounter, setMessageIdCounter] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    descricao: '',
    local: '',
    natureza_id: '',
    tipo_id: '',
    potencial: '',
    potencial_local: '',
    contrato: user?.contrato_raiz || '',
    riscoassociado_id: '1',
    ver_agir: false,
    gerou_recusa: false
  })

  const questions: Question[] = useMemo(() => [
    {
      id: 'greeting',
      text: `Olá ${user?.nome || 'usuário'}! 👋 Vou te ajudar a registrar um novo desvio. Vamos começar?`,
      field: '',
      type: 'button',
      required: false,
      buttonText: 'Vamos começar! 🚀'
    },
    {
      id: 'descricao',
      text: 'Agora descreva detalhadamente o que aconteceu:',
      field: 'descricao',
      type: 'textarea',
      required: true,
      validation: (value) => (value as string).length >= 10
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
      text: 'Este desvio requer ação imediata (Ver & Agir)?',
      field: 'ver_agir',
      type: 'radio',
      options: [
        { value: 'true', label: '⚡ Sim, requer ação imediata' },
        { value: 'false', label: '⏳ Não, pode aguardar processo normal' }
      ],
      required: true
    },
    {
      id: 'gerou_recusa',
      text: 'Este desvio gerou alguma recusa?',
      field: 'gerou_recusa',
      type: 'radio',
      options: [
        { value: 'true', label: '✅ Sim, gerou recusa' },
        { value: 'false', label: '❌ Não, não gerou recusa' }
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
  ], [user?.nome])







  // Mover typeMessage e startConversation para antes do useEffect
  const typeMessage = useCallback(async (text: string, type: 'bot' | 'user', callback?: () => void) => {
    setIsTyping(true)
    
    const messageId = `msg-${messageIdCounter}-${Date.now()}`
    setMessageIdCounter(prev => prev + 1)
    const newMessage: Message = {
      id: messageId,
      type,
      content: '',
      timestamp: new Date(),
      isTyping: type === 'bot'
    }

    setMessages(prev => [...prev, newMessage])

    // Simular digitação
    for (let i = 0; i <= text.length; i++) {
      await new Promise(resolve => setTimeout(resolve, TYPING_SPEED))
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: text.substring(0, i) }
            : msg
        )
      )
    }

    // Finalizar mensagem
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isTyping: false }
          : msg
      )
    )

    setIsTyping(false)
    
    if (callback) {
      setTimeout(callback, 300)
    }
  }, [messageIdCounter])

  const startConversation = useCallback(() => {
    setMessages([])
    setCurrentQuestionIndex(0)
    setShowInput(false)
    setTimeout(() => {
      typeMessage(questions[0].text, 'bot', () => {
        setShowInput(true)
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      })
    }, 500)
  }, [typeMessage, questions])

  // Funções de carregamento de dados
  const loadNaturezas = useCallback(async () => {
    try {
      const response = await fetch('/api/security-params/natures', {
       method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setNaturezas(data.data || [])
      }
    } catch (error) {
      console.error('Error loading naturezas:', error)
    }
  }, [])

  const loadTipos = useCallback(async (naturezaId: string) => {
    try {
      const response = await fetch(`/api/security-params/types?nature_id=${naturezaId}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setTipos(data.data || [])
      }
    } catch (error) {
      console.error('Error loading tipos:', error)
    }
  }, [])

  const loadPotenciais = useCallback(async () => {
    try {
      const response = await fetch('/api/security-params/potentials', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setPotenciais(data.data || [])
      }
    } catch (error) {
      console.error('Error loading potenciais:', error)
    }
  }, [])

  const loadRiscosAssociados = useCallback(async () => {
    try {
      const response = await fetch('/api/security-params/associated-risks', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setRiscosAssociados(data.data || [])
      }
    } catch (error) {
      console.error('Error loading riscos associados:', error)
    }
  }, [])

  const loadLocais = useCallback(async () => {
    try {
      const response = await fetch('/api/security-params/locations', {
        method: 'GET'
      })
      
      if (response.ok) {
        const data = await response.json()
        setLocais(data.data || [])
      }
    } catch (error) {
      console.error('Error loading locais:', error)
    }
  }, [])

  const resetForm = useCallback(() => {
    // 🧹 LOG DO RESET DO FORMULÁRIO
    console.log('🧹 ===== RESETFORM CHAMADO (NOVA ABORDAGEM) =====', {
      timestamp: new Date().toISOString(),
      desvioIdAntes: desvioId,
      quantidadeImagens: images.length
    })
    
    setMessages([])
    setCurrentQuestionIndex(0)
    setIsTyping(false)
    setLoading(false)
    setImagesWithLog([])
    setUserInput('')
    setShowInput(false)
    setMessageIdCounter(0)
    setDesvioId(null) // Limpar o ID do desvio
    setFormData({
      descricao: '',
      local: '',
      natureza_id: '',
      tipo_id: '',
      potencial: '',
      potencial_local: '',
      contrato: user?.contrato_raiz || '',
      riscoassociado_id: '1',
      ver_agir: false,
      gerou_recusa: false
    })
    
    // 💾 LIMPAR BACKUP APENAS QUANDO APROPRIADO
    clearImagesBackup()
    
    console.log('🧹 ✅ RESETFORM CONCLUÍDO - Estado completamente limpo')
  }, [user?.contrato_raiz]) // eslint-disable-line react-hooks/exhaustive-deps



  useEffect(() => {
    if (isOpen) {
      resetForm() // Limpar dados anteriores apenas quando abre
      loadNaturezas()
      loadLocais()
      loadPotenciais()
      loadRiscosAssociados()
      startConversation()
    }
    // Removido resetForm() quando fecha para preservar estado das imagens durante submissão
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formData.natureza_id) {
      loadTipos(formData.natureza_id)
    } else {
      setTipos([])
    }
  }, [formData.natureza_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Scroll automático quando showInput muda
  useEffect(() => {
    if (showInput) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [showInput])
  
  // 🔍 MONITOR DE MUDANÇAS NO ESTADO DAS IMAGENS COM PROTEÇÃO AUTOMÁTICA
  useEffect(() => {
    console.log('🔍 📸 ===== MUDANÇA NO ESTADO DAS IMAGENS =====', {
      timestamp: new Date().toISOString(),
      quantidadeImagens: images.length,
      detalhesImagens: images.map((img, idx) => ({
        index: idx,
        fileName: img.file.name,
        categoria: img.categoria,
        temPreview: !!img.preview,
        temUrl: !!(img as ImageFile & { url?: string }).url,
        fileSize: img.file.size,
        preview: img.preview?.substring(0, 30) + '...'
      })),
      contexto: {
        modalAberto: isOpen,
        perguntaAtual: currentQuestionIndex,
        carregando: loading,
        digitando: isTyping
      }
    })
    
    // 💾 Salvar backup sempre que houver mudança
    if (images.length > 0) {
      saveImagesToBackup(images)
    }
    
    // 🛡️ PROTEÇÃO AUTOMÁTICA CONTRA PERDA DE IMAGENS
    if (images.length === 0 && !loading && !isTyping) {
      // Verificar se há backup disponível
      const backupStr = typeof window !== 'undefined' ? localStorage.getItem(BACKUP_KEY) : null
      if (backupStr) {
        try {
          const backupData = JSON.parse(backupStr)
          if (backupData.images && backupData.images.length > 0) {
            console.log('🛡️ DETECTADA PERDA DE IMAGENS - Verificando se é perda legítima ou erro')
            
            // Se não estamos no início da conversa e havia imagens no backup, pode ser perda
            if (currentQuestionIndex > 0) {
              console.warn('⚠️ POSSÍVEL PERDA DE IMAGENS DETECTADA - Backup disponível com', backupData.images.length, 'imagens')
            }
          }
        } catch (error) {
          console.error('🛡️ Erro ao verificar backup:', error)
        }
      }
    }
    
    // 🛡️ VERIFICAÇÃO AUTOMÁTICA DE INTEGRIDADE A CADA MUDANÇA
    if (isOpen && !loading) {
      setTimeout(() => checkImageIntegrity(), 100)
    }
  }, [images, isOpen, currentQuestionIndex, loading, isTyping, checkImageIntegrity, saveImagesToBackup])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }











  const addUserMessage = (content: string) => {
    const messageId = `msg-${messageIdCounter}-${Date.now()}`
    setMessageIdCounter(prev => prev + 1)
    const newMessage: Message = {
      id: messageId,
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleUserResponse = async (value: string | number | boolean) => {
    const currentQuestion = questions[currentQuestionIndex]
    
    // 🔍 LOG DO ESTADO DAS IMAGENS EM CADA RESPOSTA
    console.log('🔍 ===== HANDLEUSERRESPONSE =====', {
      perguntaAtual: currentQuestion.id,
      perguntaTexto: currentQuestion.text,
      valorResposta: value,
      estadoImagens: {
        quantidade: images.length,
        detalhes: images.map((img, idx) => ({
          index: idx,
          fileName: img.file.name,
          categoria: img.categoria,
          temPreview: !!img.preview
        }))
      }
    })
    
    // Validar resposta se necessário
    if (currentQuestion.required && (typeof value === 'string' ? !value.trim() : !value)) {
      toast.error('Esta informação é obrigatória')
      return
    }

    if (currentQuestion.validation && typeof value === 'string' && !currentQuestion.validation(value)) {
      toast.error('Por favor, forneça uma resposta mais detalhada')
      return
    }

    // Adicionar resposta do usuário (mostrar label quando for select de natureza/tipo)
    const valueAsString = String(value)
    let displayValue = valueAsString
    if (currentQuestion.field === 'natureza_id') {
      const naturezaSelecionada = naturezas.find(n => String(n.id) === valueAsString)
      if (naturezaSelecionada) displayValue = naturezaSelecionada.natureza
    } else if (currentQuestion.field === 'tipo_id') {
      const tipoSelecionado = tipos.find(t => String(t.id) === valueAsString)
      if (tipoSelecionado) displayValue = tipoSelecionado.tipo
    } else if (currentQuestion.field === 'riscoassociado_id') {
      const riscoSelecionado = riscosAssociados.find(r => String(r.id) === valueAsString)
      if (riscoSelecionado) displayValue = riscoSelecionado.risco_associado
    } else if (currentQuestion.options && currentQuestion.options.length > 0) {
      const optionSelecionada = currentQuestion.options.find(opt => opt.value === valueAsString)
      if (optionSelecionada) displayValue = optionSelecionada.label
    }

    addUserMessage(displayValue)
    setUserInput('')
    setShowInput(false)

    // Atualizar dados do formulário
    if (currentQuestion.field !== 'images' && currentQuestion.field !== '') {
      let processedValue: unknown = value
      
      if (currentQuestion.field === 'ver_agir' || currentQuestion.field === 'gerou_recusa') {
        processedValue = value === 'true'
      }
      
      if (currentQuestion.id === 'data_confirmacao') {
        if (value === 'sim') {
          // Se confirmou que foi hoje, usar a data atual
          processedValue = new Date().toISOString().split('T')[0]
        } else {
          // Se não foi hoje, por simplicidade vamos usar a data atual (pode ser melhorado com date picker)
          processedValue = new Date().toISOString().split('T')[0]
        }
      }
      
      // Lógica especial para potencial_local
      if (currentQuestion.field === 'potencial_local') {
        const potencialSelecionado = potenciais.find(p => p.potencial_local === value)
        if (potencialSelecionado) {
          setFormData(prev => ({
            ...prev,
            potencial_local: potencialSelecionado.potencial_local,
            potencial: potencialSelecionado.potencial_sede
          }))
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [currentQuestion.field]: processedValue
        }))
      }
    }

    // 🆔 CADASTRAR DESVIO APÓS RESPONDER 'GEROU_RECUSA' E ANTES DA PERGUNTA DE IMAGENS
    if (currentQuestion.id === 'gerou_recusa') {
      setTimeout(async () => {
        try {
          // Cadastrar o desvio imediatamente após responder 'gerou_recusa'
          await cadastrarDesvioAntecipado()
          
          // Continuar para a próxima pergunta (imagens)
          if (currentQuestionIndex < questions.length - 1) {
            nextQuestion()
          } else {
            finishConversation()
          }
        } catch (error) {
          console.error('❌ Erro ao cadastrar desvio após gerou_recusa:', error)
          toast.error('Erro ao processar desvio. Tente novamente.')
          setLoading(false)
        }
      }, PAUSE_BETWEEN_MESSAGES)
    } else {
      // Próxima pergunta ou finalizar (fluxo normal para outras perguntas)
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          nextQuestion()
        } else {
          finishConversation()
        }
      }, PAUSE_BETWEEN_MESSAGES)
    }
  }

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1
    setCurrentQuestionIndex(nextIndex)
    
    // 🔄 LOG DO ESTADO DAS IMAGENS AO AVANÇAR PERGUNTA
    console.log('🔄 ===== NEXTQUESTION =====', {
      perguntaAnterior: currentQuestionIndex,
      proximaPergunta: nextIndex,
      estadoImagens: {
        quantidade: images.length,
        detalhes: images.map((img, idx) => ({
          index: idx,
          fileName: img.file.name,
          categoria: img.categoria,
          temPreview: !!img.preview
        }))
      }
    })
    
    if (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex]
      
      setTimeout(() => {
        typeMessage(nextQuestion.text, 'bot', () => {
          setShowInput(true)
          setTimeout(() => {
            scrollToBottom()
          }, 100)
        })
      }, 500)
    }
  }



  const finishConversation = async () => {
    // 🏁 LOG SIMPLIFICADO DO ESTADO AO FINALIZAR CONVERSA
    console.log('🏁 ===== FINISHCONVERSATION CHAMADA (NOVA ABORDAGEM) =====', {
      timestamp: new Date().toISOString(),
      desvioId: desvioId,
      desvioJaCadastrado: !!desvioId,
      quantidadeImagens: images.length,
      imagensJaCadastradas: images.filter(img => (img as ImageFile & { cadastrada?: boolean }).cadastrada).length
    })
    
    // O desvio já deve ter sido cadastrado após a pergunta 'gerou_recusa'
    if (!desvioId) {
      console.error('❌ ERRO CRÍTICO: Desvio deveria ter sido cadastrado após gerou_recusa!')
      toast.error('Erro interno: Desvio não foi cadastrado corretamente.')
      setLoading(false)
      return
    }
    
    typeMessage('Perfeito! Todas as informações foram processadas com sucesso. Finalizando o relato...', 'bot', () => {
      setTimeout(() => handleSubmit(), 1000)
    })
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      
      // 🚀 LOG DO HANDLESUBMIT SIMPLIFICADO
      console.log('🚀 ===== HANDLESUBMIT EXECUTADO (NOVA ABORDAGEM) =====', {
        timestamp: new Date().toISOString(),
        desvioId: desvioId,
        desvioJaCadastrado: !!desvioId,
        quantidadeImagens: images.length,
        imagensJaCadastradas: images.filter(img => (img as ImageFile & { cadastrada?: boolean }).cadastrada).length
      })
      
      // ✅ VERIFICAR SE O DESVIO JÁ FOI CADASTRADO
      if (!desvioId) {
        console.error('❌ ERRO: Desvio não foi cadastrado ainda!')
        throw new Error('Erro interno: Desvio não foi cadastrado')
      }
      
      console.log('✅ Desvio já cadastrado com ID:', desvioId)
      console.log('✅ Imagens já processadas:', images.length)

      typeMessage('✅ Relato criado com sucesso! Obrigado por contribuir com a segurança.', 'bot', () => {
        setTimeout(() => {
          toast.success('Desvio criado com sucesso!')
          // Reset do formulário apenas após cadastro completo (desvio + imagens)
          resetForm()
          onSuccess?.()
          onClose()
        }, 2000)
      })
      
    } catch (error) {
      console.error('Error creating desvio:', error)
      typeMessage('❌ Ops! Ocorreu um erro ao criar o relato. Tente novamente.', 'bot')
      toast.error('Erro ao criar desvio')
    } finally {
      setLoading(false)
    }
  }



  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    console.log('📸 🔄 INICIANDO UPLOAD DE IMAGENS (APENAS UPLOAD E ARMAZENAMENTO LOCAL):', {
      timestamp: new Date().toISOString(),
      quantidadeArquivos: files.length,
      arquivos: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    })

    // Processar cada imagem - APENAS UPLOAD E ARMAZENAMENTO NO ESTADO LOCAL
    for (const file of files) {
      try {
        // 1. Upload do arquivo para obter a URL
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)
        
        const uploadResponse = await fetch('/api/desvios/upload-image', {
          method: 'POST',
          body: uploadFormData
        })
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          toast.error(errorData.error || `Erro no upload de ${file.name}`)
          continue
        }
        
        const uploadResult = await uploadResponse.json()
        
        if (uploadResult.success) {
          const imageUrl = uploadResult.data.publicUrl
          
          // 🆔 VERIFICAR SE TEMOS O ID DO DESVIO
          if (!desvioId) {
            console.error('❌ ERRO: desvioId não encontrado! Não é possível cadastrar a imagem.')
            toast.error('Erro: Desvio não foi cadastrado ainda. Tente novamente.')
            continue
          }
          
          // 2. CADASTRAR IMAGEM NA TABELA imagens_desvios IMEDIATAMENTE
          try {
            const imagemData = {
              desvio_id: desvioId,
              url: imageUrl,
              categoria: 'evidencia'
            }
            
            console.log('📸 🆔 CADASTRANDO IMAGEM NA TABELA:', imagemData)
            
            const cadastroResponse = await fetch('/api/desvios/imagens', {
              method: 'POST',
              body: JSON.stringify(imagemData)
            })
            
            if (!cadastroResponse.ok) {
              const errorData = await cadastroResponse.json()
              throw new Error(`Erro ao cadastrar imagem: ${errorData.message || cadastroResponse.statusText}`)
            }
            
            const cadastroResult = await cadastroResponse.json()
            console.log('📸 ✅ IMAGEM CADASTRADA COM SUCESSO:', cadastroResult)
            
            // 3. Armazenar no estado local apenas para preview
            console.log('📸 ✅ ADICIONANDO IMAGEM AO ESTADO LOCAL (APENAS PREVIEW):', {
              fileName: file.name,
              imageUrl: imageUrl,
              categoria: 'evidencia',
              desvioId: desvioId,
              estadoAtualAntes: images.length
            })
            
            setImagesWithLog(prev => {
              const novoEstado = [...prev, { 
                file, 
                preview: imageUrl, // URL da imagem para preview
                categoria: 'evidencia' as const,
                url: imageUrl, // URL armazenada
                cadastrada: true // Marca que já foi cadastrada
              }]
              
              console.log('📸 ✅ IMAGEM PROCESSADA COMPLETAMENTE:', {
                fileName: file.name,
                estadoAnterior: prev.length,
                novoEstado: novoEstado.length,
                cadastradaNaTabela: true,
                desvioId: desvioId
              })
              
              return novoEstado
            })
            
            toast.success(`${file.name} enviada e cadastrada com sucesso!`)
          } catch (error) {
            console.error('❌ Erro ao cadastrar imagem na tabela:', error)
            toast.error(`Erro ao cadastrar ${file.name}. Tente novamente.`)
            continue
          }
        } else {
          toast.error(`Erro no upload de ${file.name}`)
        }
      } catch (error) {
        console.error('Erro no processamento do arquivo:', file.name, error)
        toast.error(`Erro no processamento de ${file.name}`)
      }
    }

    // Continuar com o fluxo conversacional
    if (files.length > 0) {
      handleUserResponse(`${files.length} imagem(ns) anexada(s)`)
    } else {
      handleUserResponse('Nenhuma imagem anexada')
    }
  }

  const renderInput = () => {
    const currentQuestion = questions[currentQuestionIndex]
    
    if (!showInput) return null

    switch (currentQuestion.type) {
      case 'textarea':
        return (
          <div className="flex items-end space-x-2">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleUserResponse(userInput)
                }
              }}
            />
            <button
              onClick={() => handleUserResponse(userInput)}
              disabled={!userInput.trim()}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )

      case 'select': {
        const options = currentQuestion.field === 'natureza_id' ? 
          naturezas.map(n => ({ value: n.id, label: n.natureza })) :
          currentQuestion.field === 'tipo_id' ?
          tipos.map(t => ({ value: t.id, label: t.tipo })) :
          currentQuestion.field === 'local' ?
          locais.map(l => ({ value: l.local, label: l.local })) :
          currentQuestion.field === 'potencial_local' ?
          potenciais.map(p => ({ value: p.potencial_local, label: p.potencial_local })) :
          currentQuestion.field === 'riscoassociado_id' ?
          riscosAssociados.map(r => ({ value: r.id, label: r.risco_associado })) :
          currentQuestion.options || []

        console.log('🔍 Opções disponíveis para', currentQuestion.field, ':', options)

        if (options.length === 0) {
          return (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">Carregando opções...</p>
            </div>
          )
        }

        const sortedOptions = currentQuestion.field === 'local'
          ? [...options].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))
          : options

        if (currentQuestion.field === 'local') {
          return (
            <div className="space-y-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleUserResponse(e.target.value)
                  }
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="" disabled>Selecione o local...</option>
                {sortedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )
        }
        
        if (currentQuestion.field === 'riscoassociado_id') {
          return (
            <div className="space-y-2">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleUserResponse(e.target.value)
                  }
                }}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="" disabled>Selecione o risco associado...</option>
                {sortedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        return (
          <div className="space-y-2">
            {sortedOptions.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                onClick={() => handleUserResponse(option.value)}
                className="w-full text-left px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white font-medium"
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
            {currentQuestion.options?.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                onClick={() => handleUserResponse(option.value)}
                className="w-full text-left px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-900 dark:text-white font-medium"
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
              className="w-full flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors"
            >
              <div className="text-center">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Clique para adicionar imagens
                </span>
              </div>
            </button>
            
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image.preview}
                    alt={`Imagem ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleUserResponse(images.length > 0 ? `${images.length} imagem(ns) anexada(s)` : 'Nenhuma imagem')}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {images.length > 0 ? 'Continuar com imagens' : 'Pular imagens'}
              </button>
            </div>
            
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

      case 'button': {
        return (
          <div className="flex justify-center">
            <button
              onClick={() => handleUserResponse('continue')}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              {currentQuestion.buttonText || 'Continuar'}
            </button>
          </div>
        )
      }

      default:
        return (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleUserResponse(userInput)
                }
              }}
            />
            <button
              onClick={() => handleUserResponse(userInput)}
              disabled={!userInput.trim()}
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center">
              <Bot className="h-6 w-6 text-orange-600 mr-3" />
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
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-[80%] ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className={`px-4 py-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    {message.isTyping && (
                      <div className="flex items-center mt-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[80%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
                    <p className="text-sm">Processando...</p>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {showInput && !loading && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-600">
              {renderInput()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
