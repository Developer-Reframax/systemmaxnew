'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  X,
  Send,
  Bot,
  Loader2,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface AvaliacaoConversacionalProps {
  isOpen: boolean
  onClose: () => void
  desvio: Desvio | null
  onSuccess?: () => void
}

interface Desvio {
  id: string
  titulo?: string
  matricula_user?: string
  descricao: string
  natureza_id?: number
  contrato?: string
  local: string
  riscoassociado_id?: number
  tipo_id?: number
  responsavel?: string | {
    matricula: string
    nome: string
  }
  equipe_id?: string
  potencial: string
  acao?: string
  observacao?: string
  data_conclusao?: string
  ver_agir: boolean
  data_limite?: string
  status: string
  potencial_local?: string
  acao_cliente?: boolean
  gerou_recusa?: boolean
  created_at: string
  updated_at?: string
  data_ocorrencia?: string
  gravidade?: string
  // Relacionamentos
  natureza?: {
    id: number | string
    natureza: string
  }
  tipo?: {
    id: number | string
    tipo: string
  }
  risco_associado?: {
    id: number
    risco_associado: string
  }
  criador?: {
    nome: string
    matricula?: string
  }
  imagens?: ImagemDesvio[]
}

interface ImagemDesvio {
  id: string
  desvio_id: string
  categoria: 'desvio' | 'evidencia'
  nome_arquivo: string
  url_storage: string
  tamanho?: number
  tipo_mime?: string
  created_at: string
}

interface Potencial {
  id: string
  potencial_sede: string
  potencial_local: string
  contrato: string
  created_at: string
  updated_at: string
}



interface Usuario {
  id: string
  nome: string
  email: string
  matricula: string
  contrato_raiz: string
}

interface Message {
  id: string
  type: 'bot' | 'user'
  content: string
  timestamp: Date
  isTyping?: boolean
  imageUrl?: string
}

interface Question {
  id: string
  text: string
  field: keyof AvaliacaoData | ''
  type: 'text' | 'textarea' | 'select' | 'radio' | 'button'
  options?: { value: string; label: string }[]
  validation?: (value: unknown) => boolean
  required: boolean
  buttonText?: string
  conditional?: boolean
}

interface AvaliacaoData {
  iniciar_avaliacao: boolean
  concorda_potencial: boolean
  novo_potencial?: string
  acao_cliente: boolean
  responsavel: string
  acao: string
}

const TYPING_SPEED = 20
const PAUSE_BETWEEN_MESSAGES = 500

export default function AvaliacaoConversacional({ isOpen, onClose, desvio, onSuccess }: AvaliacaoConversacionalProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [potenciais, setPotenciais] = useState<Potencial[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [desvioCompleto, setDesvioCompleto] = useState<Desvio | null>(null)
  const [userInput, setUserInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [messageIdCounter, setMessageIdCounter] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [avaliacaoData, setAvaliacaoData] = useState<AvaliacaoData>({
    iniciar_avaliacao: false,
    concorda_potencial: false,
    novo_potencial: '',
    acao_cliente: false,
    responsavel: '',
    acao: ''
  })

  const questions: Question[] = useMemo(() => [
    {
      id: 'greeting',
      text: `Olá ${user?.nome || 'avaliador'}! 👋 Vamos iniciar a avaliação deste desvio?`,
      field: 'iniciar_avaliacao',
      type: 'radio',
      options: [
        { value: 'true', label: '✅ Sim, vamos começar!' },
        { value: 'false', label: '❌ Não, cancelar avaliação' }
      ],
      required: true
    },
    {
      id: 'concorda_potencial',
      text: `Você concorda com o POTENCIAL "${desvioCompleto?.potencial || desvio?.potencial || 'Não informado'}" informado pelo colaborador?`,
      field: 'concorda_potencial',
      type: 'radio',
      options: [
        { value: 'true', label: '✅ Sim, concordo com o potencial informado' },
        { value: 'false', label: '❌ Não, preciso alterar o potencial' }
      ],
      required: true
    },
    {
      id: 'novo_potencial',
      text: 'Qual o potencial mais adequado para esse desvio?',
      field: 'novo_potencial',
      type: 'select',
      required: true,
      conditional: true // Só aparece se não concordar com o potencial
    },
    {
      id: 'acao_cliente',
      text: 'O desvio é de responsabilidade do cliente?',
      field: 'acao_cliente',
      type: 'radio',
      options: [
        { value: 'true', label: '✅ Sim, é responsabilidade do cliente' },
        { value: 'false', label: '❌ Não, é responsabilidade interna' }
      ],
      required: true
    },
    {
      id: 'responsavel',
      text: 'Quem é o responsável por resolver esse desvio?',
      field: 'responsavel',
      type: 'select',
      required: true
    },
    {
      id: 'acao',
      text: 'Qual ação deve ser realizada para resolver este desvio?',
      field: 'acao',
      type: 'textarea',
      required: true,
      validation: (value) => (value as string).length >= 10
    }
  ], [user?.nome, desvioCompleto?.potencial, desvio?.potencial])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const resetForm = useCallback(() => {
    setMessages([])
    setCurrentQuestionIndex(0)
    setShowInput(false)
    setIsTyping(false)
    setUserInput('')
    setAvaliacaoData({
      iniciar_avaliacao: false,
      concorda_potencial: false,
      novo_potencial: '',
      acao_cliente: false,
      responsavel: '',
      acao: ''
    })
  }, [])

  const loadDesvioCompleto = useCallback(async () => {
    if (!desvio?.id) {
      console.error('ID do desvio não fornecido')
      return null
    }

    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/desvios/${desvio.id}`, {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDesvioCompleto(data.data)
          return data.data
        }
      }
    } catch (error) {
      console.error('Erro ao carregar desvio completo:', error)
    }
    return null
  }, [desvio?.id])

  const loadPotenciais = useCallback(async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/security-params/potentials', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPotenciais(data.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar potenciais:', error)
    }
  }, [])

  const loadRiscosAssociados = useCallback(async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/security-params/associated-risks', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // Dados carregados com sucesso
        console.log('Riscos associados carregados:', data.data?.length || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar riscos associados:', error)
    }
  }, [])

  const loadUsuarios = useCallback(async () => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${auth_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Filtrar usuários do mesmo contrato_raiz
          const usuariosMesmoContrato = data.users.filter((usuario: Usuario) => 
            usuario.contrato_raiz === user?.contrato_raiz
          )
          setUsuarios(usuariosMesmoContrato)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }
  }, [user?.contrato_raiz])

 



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
            ? { ...msg, content: text.slice(0, i) }
            : msg
        )
      )
    }

    // Remover indicador de digitação
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

  const showInputForQuestion = useCallback(() => {
    // setCurrentInputType(question.type)
    setShowInput(true)
    setUserInput('')
    // Fazer scroll automático após mostrar o input
    setTimeout(() => {
      scrollToBottom()
    }, 100)
  }, [])

  const startConversation = useCallback((desvioCarregado?: Desvio) => {
    // Verificar se desvio existe antes de prosseguir
    if (!desvio) {
      console.error('Desvio não fornecido para AvaliacaoConversacional')
      return
    }

    // Usar o desvio carregado diretamente se fornecido, senão usar desvioCompleto ou desvio
    const desvioInfo = desvioCarregado || desvioCompleto || desvio
    

    const infoMessage = `📋 **INFORMAÇÕES DO DESVIO**

**Descrição:** ${desvioInfo?.descricao || 'Não informado'}
**Local:** ${desvioInfo?.local || 'Não informado'}
**Data de Ocorrência:** ${desvioInfo?.created_at ? new Date(desvioInfo.created_at).toLocaleDateString('pt-BR') : 'Não informada'}
**Natureza:** ${desvioInfo?.natureza?.natureza || 'Carregando...'}
**Tipo:** ${desvioInfo?.tipo?.tipo || 'Carregando...'}
**Potencial Atual:** ${desvioInfo?.potencial || 'Não informado'}
**Potencial Local:** ${desvioInfo?.potencial_local || 'Não informado'}
**Ver & Agir:** ${desvioInfo?.ver_agir ? 'Sim' : 'Não'}
**Gerou Recusa:** ${desvioInfo?.gerou_recusa ? 'Sim' : 'Não'}
**Status:** ${desvioInfo?.status || 'Não informado'}
**Criado por:** ${desvioInfo?.criador?.nome || 'Não informado'}
**Criado em:** ${desvioInfo?.created_at ? new Date(desvioInfo.created_at).toLocaleString('pt-BR') : 'Não informado'}

${desvioInfo?.imagens && desvioInfo.imagens.length > 0 ? `**Imagens:** ${desvioInfo.imagens.length} arquivo(s) anexado(s)

${desvioInfo.imagens.map((img: ImagemDesvio, index: number) => `📷 **Imagem ${index + 1}:** ${img.nome_arquivo}`).join('\n')}` : '**Imagens:** Nenhuma imagem anexada'}`

    typeMessage(infoMessage, 'bot', () => {
      if (desvioInfo?.imagens && desvioInfo.imagens.length > 0) {
        setTimeout(() => {
          showImagesInChat(desvioInfo.imagens!)
        }, 500)
      }
      
      setTimeout(() => {
        typeMessage(questions[0].text, 'bot', () => {
          showInputForQuestion()
        })
      }, 1000)
    })
  }, [desvio, desvioCompleto, questions, typeMessage, showInputForQuestion])

  const loadInitialData = useCallback(async () => {
    // Verificar se o desvio existe antes de tentar carregar os dados
    if (!desvio?.id) {
      console.error('Desvio não fornecido para loadInitialData')
      return
    }

    setLoading(true)
    try {
      // Carregar desvio completo primeiro para garantir que as imagens estejam disponíveis
      const desvioCarregado = await loadDesvioCompleto()
      
      // Só continuar se conseguiu carregar o desvio
      if (!desvioCarregado) {
        console.error('Falha ao carregar desvio completo')
        return
      }
      
      // Depois carregar os outros dados em paralelo
      await Promise.all([
        loadPotenciais(),
        loadRiscosAssociados(),
        loadUsuarios()
      ])
      
      // Aguardar que o estado seja atualizado antes de iniciar a conversa
      setTimeout(() => {
        // Passar o desvio carregado diretamente para startConversation
        startConversation(desvioCarregado)
      }, 1000) // Aumentado para 1000ms para garantir que o estado foi atualizado
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      toast.error('Erro ao carregar dados necessários')
    } finally {
      setLoading(false)
    }
  }, [desvio?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && desvio?.id) {
      // Só resetar o form se for uma nova avaliação (não resetar durante o processo)
      if (currentQuestionIndex === 0 && messages.length === 0) {
        resetForm()
      }
      loadInitialData()
    }
  }, [isOpen, desvio?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const showImagesInChat = (imagens: ImagemDesvio[]) => {
    imagens.forEach((img, index) => {
      setTimeout(() => {
        const imageMessage = `🖼️ **Imagem ${index + 1}:** ${img.nome_arquivo}
        
*Clique para visualizar a imagem em tamanho real*`
        
        const messageId = `img-${index}-${Date.now()}`
        setMessageIdCounter(prev => prev + 1)
        
        const newMessage: Message = {
          id: messageId,
          type: 'bot',
          content: imageMessage,
          timestamp: new Date(),
          imageUrl: img.url_storage // Adicionar URL da imagem
        }
        
        setMessages(prev => [...prev, newMessage])
      }, index * 300) // Delay entre imagens
    })
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

  const handleUserResponse = async (response: string, displayText?: string) => {
    setShowInput(false)
    
    // Adicionar mensagem do usuário
    addUserMessage(displayText || response)
    
    // Processar resposta
    const currentQuestion = questions[currentQuestionIndex]
    

    
    // Atualizar dados da avaliação
    if (currentQuestion.field) {
      const newValue = currentQuestion.type === 'radio' ? response === 'true' : response
      
      setAvaliacaoData(prev => ({ ...prev, [currentQuestion.field]: newValue }))
    }
    
    // Verificar se deve cancelar avaliação
    if (currentQuestion.id === 'greeting' && response === 'false') {
      await typeMessage('Avaliação cancelada. Fechando formulário...', 'bot')
      setTimeout(() => {
        onClose()
      }, 1500)
      return
    }
    
    // Determinar próxima pergunta
    let nextIndex = currentQuestionIndex + 1
    
    // Lógica condicional: pular pergunta do potencial se concordar
    if (currentQuestion.id === 'concorda_potencial' && response === 'true') {
      nextIndex = currentQuestionIndex + 2 // Pular pergunta do novo potencial
    }
    
    // Verificar se chegou ao fim
    if (nextIndex >= questions.length) {
      // Se a pergunta atual é 'acao', passar o valor diretamente
      const acaoValue = currentQuestion.id === 'acao' ? response : undefined

      await finishConversation(acaoValue)
      return
    }
    
    // Pular perguntas condicionais se necessário
    while (nextIndex < questions.length && questions[nextIndex].conditional && 
           (currentQuestion.id === 'concorda_potencial' && response === 'true')) {
      nextIndex++
    }
    
    if (nextIndex >= questions.length) {
      // Se a pergunta atual é 'acao', passar o valor diretamente
      const acaoValue = currentQuestion.id === 'acao' ? response : undefined

      await finishConversation(acaoValue)
      return
    }
    
    setCurrentQuestionIndex(nextIndex)
    
    // Fazer próxima pergunta
    setTimeout(() => {
      typeMessage(questions[nextIndex].text, 'bot', () => {
        showInputForQuestion()
      })
    }, PAUSE_BETWEEN_MESSAGES)
  }

  const finishConversation = async (acaoValue?: string) => {
    await typeMessage('Processando avaliação... ⏳', 'bot')
    
    // Aguardar um pequeno delay para garantir que o estado foi atualizado
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      // Preparar dados de override se temos o valor da ação
      const overrideData = acaoValue ? { acao: acaoValue } : undefined
      

      
      await submitAvaliacao(overrideData)
      await typeMessage('✅ Avaliação concluída com sucesso! O desvio foi movido para "Em Andamento".', 'bot')
      
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 2000)
    } catch (error) {
      await typeMessage('❌ Erro ao processar avaliação. Tente novamente.', 'bot')
      console.error('Erro ao finalizar avaliação:', error)
    }
  }

  const submitAvaliacao = async (overrideData?: Partial<AvaliacaoData>) => {
    try {
      const auth_token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      // Usar dados fornecidos diretamente ou fallback para o estado
      const finalData = { ...avaliacaoData, ...overrideData }
      

      
      // Validação crítica: verificar se o campo acao está vazio
      if (!finalData.acao || finalData.acao.trim() === '') {
        console.error('🚨 [ERRO CRÍTICO] Campo acao está vazio no momento do envio!')

        throw new Error('Campo ação é obrigatório e não pode estar vazio')
      }
      
      // Preparar dados do potencial baseado na resposta do avaliador
      let potencialData = {}
      
      if (finalData.concorda_potencial) {
        // Se concorda, manter os potenciais atuais do desvio
        potencialData = {
          potencial: desvio?.potencial || desvioCompleto?.potencial,
          potencial_local: desvio?.potencial_local || desvioCompleto?.potencial_local
        }
      } else if (finalData.novo_potencial) {
        // Se não concorda, usar o novo potencial selecionado
        const potencialSelecionado = potenciais.find(p => 
          p.potencial_local === finalData.novo_potencial && 
          p.contrato === user?.contrato_raiz
        )
        
        if (potencialSelecionado) {
          potencialData = {
            potencial: potencialSelecionado.potencial_sede,
            potencial_local: potencialSelecionado.potencial_local
          }
        }
      }
      
      const avaliacaoPayload = {
        responsavel: finalData.responsavel,
        acao: finalData.acao, // Usar dados finais em vez do estado
        acao_cliente: finalData.acao_cliente,
        ...potencialData
      }
      

      
      const response = await fetch(`/api/desvios/${desvio?.id}/avaliar`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(avaliacaoPayload)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao avaliar desvio')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Erro ao avaliar desvio')
      }
      
      toast.success('Desvio avaliado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao submeter avaliação:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao avaliar desvio')
      throw error
    }
  }

  const renderInput = () => {
    const currentQuestion = questions[currentQuestionIndex]
    
    if (!currentQuestion) return null
    
    switch (currentQuestion.type) {
      case 'radio':
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => handleUserResponse(option.value, option.label)}
                className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        )
      
      case 'select': {
        let options: { value: string; label: string }[] = []
        
        if (currentQuestion.id === 'novo_potencial') {
          options = potenciais
            .filter(p => p.contrato === user?.contrato_raiz)
            .map(p => ({ value: p.potencial_local, label: p.potencial_local }))
        } else if (currentQuestion.id === 'responsavel') {
          options = usuarios.map(u => ({ value: u.matricula, label: `${u.nome} (${u.matricula})` }))
        }
        
        return (
          <div className="space-y-2">
            <select
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione uma opção...</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (userInput) {
                  const selectedOption = options.find(opt => opt.value === userInput)
                  handleUserResponse(userInput, selectedOption?.label || userInput)
                }
              }}
              disabled={!userInput}
              className="w-full bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Send className="h-4 w-4 mr-2" />
              Confirmar
            </button>
          </div>
        )
      }
      
      case 'textarea': {

        
        return (
          <div className="space-y-2">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Digite sua resposta..."
              rows={4}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
            />
            <button
              onClick={() => {
                if (userInput.trim()) {
                  const trimmedInput = userInput.trim()
                  handleUserResponse(trimmedInput)
                  setUserInput('')
                }
              }}
              disabled={!userInput.trim() || (currentQuestion.validation && !currentQuestion.validation(userInput))}
              className="w-full bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </button>
          </div>
        )
      }
      
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-orange-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Avaliação de Desvio
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ID: {desvio?.id?.substring(0, 8) || 'N/A'}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Carregando dados do desvio...
              </p>
            </div>
          </div>
        )}

        {/* Chat Area */}
        {!loading && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.type === 'bot' && (
                      <div className="flex items-center mb-2">
                        <Bot className="h-4 w-4 mr-2" />
                        <span className="text-xs font-medium">Assistente de Avaliação</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">
                      {message.content}
                      {message.isTyping && (
                        <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                      )}
                    </div>
                    {message.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={message.imageUrl}
                          alt="Imagem do desvio"
                          className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(message.imageUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {showInput && !isTyping && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-600">
                {renderInput()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
