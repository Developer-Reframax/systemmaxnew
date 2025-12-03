'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { ESTADOS_EMOCIONAL, type EstadoEmocional } from '@/lib/types/emociograma'
import { Camera, Sparkles, Shield, Smile, Loader2, X, User } from 'lucide-react'

type PoseKey = 'front' | 'right' | 'left'

interface FaceTemplate {
  matricula: number | string
  nome: string
  email?: string
  funcao?: string
  role?: string
  avatar_url?: string
  descriptors: Partial<Record<PoseKey, number[]>>
  modelVersion?: string | null
}
type FaceTemplateApi = {
  matricula: number | string
  nome: string
  email?: string
  funcao?: string
  role?: string
  avatar_url?: string
  descriptors?: Partial<Record<PoseKey, number[]>>
  modelVersion?: string | null
  model_version?: string | null
}

interface MatchResult {
  label: string
  confidence: number
  user?: FaceTemplate
  timestamp: string
}

type FaceApiInstance = {
  nets: {
    ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> }
    faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> }
    faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> }
    faceExpressionNet: { loadFromUri: (url: string) => Promise<void> }
  }
  SsdMobilenetv1Options: new (options?: { minConfidence?: number }) => unknown
  LabeledFaceDescriptors: new (label: string, descriptors: Float32Array[]) => unknown
  FaceMatcher: new (labeled: unknown[], distance?: number) => {
    findBestMatch: (descriptor: Float32Array) => { label: string; distance: number }
  }
  detectSingleFace: (input: HTMLVideoElement, options?: unknown) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<{
        detection: { box: { x: number; y: number; width: number; height: number } }
        descriptor: Float32Array
      } | null>
    }
  }
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'

export default function EmociogramaDDSPage() {
  const { user } = useAuth()
  const router = useRouter()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceApiRef = useRef<FaceApiInstance | null>(null)
  const detectionOptionsRef = useRef<unknown>(null)
  const matcherRef = useRef<
    | {
        findBestMatch: (descriptor: Float32Array) => { label: string; distance: number }
      }
    | null
  >(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [statusMessage, setStatusMessage] = useState('Carregando inteligencia visual...')
  const [streamReady, setStreamReady] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null)
  const currentMatchRef = useRef<MatchResult | null>(null)
  const [selectedEmotion, setSelectedEmotion] = useState<EstadoEmocional | ''>('')
  const [observacoes, setObservacoes] = useState('')
  const [saving, setSaving] = useState(false)
  const templatesRef = useRef<FaceTemplate[]>([])
  const lastMatchIdRef = useRef<string | null>(null)
  const modelsLoadedRef = useRef(false)

  const ensureFaceApi = useCallback(async (): Promise<FaceApiInstance | null> => {
    if (typeof window === 'undefined') return null
    const globalWithFaceApi = window as unknown as { faceapi?: FaceApiInstance }
    if (globalWithFaceApi.faceapi) return globalWithFaceApi.faceapi

    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js'
      script.async = true
      script.onload = resolve
      script.onerror = reject
      document.body.appendChild(script)
    })

    return (window as unknown as { faceapi?: FaceApiInstance }).faceapi || null
  }, [])

  const loadModels = useCallback(async () => {
    const faceapi = await ensureFaceApi()
    if (!faceapi) throw new Error('face-api nao disponivel')
    if (!modelsLoadedRef.current) {
      setStatusMessage('Carregando modelos...')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      detectionOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      modelsLoadedRef.current = true
    } else if (!detectionOptionsRef.current) {
      detectionOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
    }
    faceApiRef.current = faceapi
    setStatusMessage('Modelos carregados')
    return faceapi
  }, [ensureFaceApi])

  const buildMatcher = useCallback(async (currentTemplates: FaceTemplate[]) => {
    const faceapi = await loadModels()
    const labeled = currentTemplates
      .map((template) => {
        const vectors = Object.values(template.descriptors || {})
          .filter(Boolean)
          .map((descriptor) => new Float32Array(descriptor as number[]))
        if (!vectors.length) return null
        return new faceapi.LabeledFaceDescriptors(String(template.matricula), vectors)
      })
      .filter(Boolean)

    matcherRef.current = labeled.length ? new faceapi.FaceMatcher(labeled, 0.45) : null
  }, [loadModels])

  const detectLoop = useCallback(async () => {
    const faceapi = faceApiRef.current
    if (!faceapi || !videoRef.current || !detectionOptionsRef.current) return

    const detection = await faceapi
      .detectSingleFace(videoRef.current, detectionOptionsRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const displayWidth = videoRef.current.clientWidth || videoRef.current.videoWidth
        const displayHeight = videoRef.current.clientHeight || videoRef.current.videoHeight
        const scaleX = displayWidth / videoRef.current.videoWidth
        const scaleY = displayHeight / videoRef.current.videoHeight

        canvas.width = displayWidth
        canvas.height = displayHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (detection?.detection?.box) {
          const { x, y, width, height } = detection.detection.box
          ctx.strokeStyle = '#22c55e'
          ctx.lineWidth = 3
          ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY)
        }
      }
    }

    if (detection && matcherRef.current) {
      const bestMatch = matcherRef.current.findBestMatch(detection.descriptor)
      if (bestMatch && bestMatch.label !== 'unknown') {
        if (lastMatchIdRef.current !== bestMatch.label) {
          const matchedUser = templatesRef.current.find((t) => String(t.matricula) === bestMatch.label)
          const nextMatch: MatchResult = {
            label: bestMatch.label,
            confidence: Math.round((1 - bestMatch.distance) * 100),
            user: matchedUser,
            timestamp: new Date().toISOString()
          }
          currentMatchRef.current = nextMatch
          setCurrentMatch(nextMatch)
          setSelectedEmotion('')
          setObservacoes('')
          setStatusMessage('Usuario reconhecido, registre o estado emocional.')
          lastMatchIdRef.current = bestMatch.label
        }
      } else if (currentMatchRef.current) {
        setCurrentMatch(null)
        currentMatchRef.current = null
        setSelectedEmotion('')
        setObservacoes('')
        setStatusMessage('Aguardando reconhecimento facial...')
        lastMatchIdRef.current = null
      }
    } else if (currentMatchRef.current) {
      setCurrentMatch(null)
      currentMatchRef.current = null
      setSelectedEmotion('')
      setObservacoes('')
      setStatusMessage('Aguardando reconhecimento facial...')
      lastMatchIdRef.current = null
    }

    animationRef.current = requestAnimationFrame(detectLoop)
  }, [])

  const startScanner = useCallback(async () => {
    try {
      setStatusMessage('Ativando camera...')
      const faceapi = faceApiRef.current || (await loadModels())
      if (!faceapi) throw new Error('face-api nao disponivel')

      // finaliza stream anterior para evitar aborts de play
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch (err) {
          // AbortError pode ocorrer ao trocar rapidamente o srcObject; ignore e continue
          console.warn('play video aborted, tentando continuar', err)
        }
      }
      streamRef.current = stream
      setStreamReady(true)
      setStatusMessage('Aguardando reconhecimento facial...')
      detectLoop()
    } catch (error) {
      console.error('Erro ao iniciar scanner facial:', error)
      toast.error('Nao foi possivel iniciar a leitura da camera')
    }
  }, [loadModels, detectLoop])

  const stopScanner = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setStreamReady(false)
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return
      const response = await fetch('/api/face/templates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Erro ao buscar templates faciais')
      const data = await response.json()
      const mapped: FaceTemplate[] =
        data.templates?.map((t: FaceTemplateApi) => ({
          matricula: t.matricula,
          nome: t.nome,
          email: t.email,
          funcao: t.funcao,
          role: t.role,
          avatar_url: t.avatar_url,
          descriptors: t.descriptors || {},
          modelVersion: t.modelVersion || t.model_version || null
        })) || []
      templatesRef.current = mapped
      if (mapped.length === 0) {
        toast.info('Nenhuma face treinada para reconhecimento.')
      } else {
        await buildMatcher(mapped)
        startScanner()
      }
    } catch (error) {
      console.error('Erro ao carregar templates faciais:', error)
      toast.error('Nao foi possivel carregar templates faciais')
    }
  }, [buildMatcher, startScanner])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
    return () => {
      stopScanner()
    }
  }, [user, fetchTemplates, stopScanner])

  const submitEmociograma = async () => {
    if (!currentMatch?.user || !selectedEmotion) {
      toast.error('Selecione um estado emocional')
      return
    }

    try {
      setSaving(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token nao encontrado')
        return
      }

      const response = await fetch('/api/emociograma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          estado_emocional: selectedEmotion,
          observacoes: observacoes.trim() || undefined
        })
      })

      if (!response.ok) {
        let message = 'Nao foi possivel registrar emociograma'
        try {
          const body = await response.json()
          if (body?.message) message = body.message
        } catch  {
          // ignore parse errors
        }
        if (response.status === 409 || response.status === 400) {
          toast.error('Registro ja realizado recentemente para este usuario. Tente novamente mais tarde.')
        } else {
          toast.error(message)
        }
        return
      }

      toast.success('Emociograma registrado')

      // reset para proximo usuario
      setCurrentMatch(null)
      currentMatchRef.current = null
      setSelectedEmotion('')
      setObservacoes('')
      lastMatchIdRef.current = null
      setStatusMessage('Aguardando reconhecimento facial...')
    } catch (error) {
      console.error('Erro ao registrar emociograma:', error)
      toast.error('Nao foi possivel registrar emociograma')
    } finally {
      setSaving(false)
    }
  }

  const emotionButtons = Object.entries(ESTADOS_EMOCIONAL)

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col z-40 overflow-y-auto lg:overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">DDS Emociograma</p>
          <h1 className="text-2xl font-bold">Reconhecimento facial + registro emocional</h1>
          <p className="text-sm text-gray-300">{statusMessage}</p>
        </div>
        <button
          onClick={() => router.push('/emociograma')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/30 hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
          Fechar
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        <div className="lg:col-span-2 bg-black/30 rounded-2xl border border-white/10 relative overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {!streamReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Camera className="h-8 w-8 text-white" />
            </div>
          )}
          <div className="absolute top-4 left-4 bg-white/10 backdrop-blur px-3 py-2 rounded-lg text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            {streamReady ? 'Scanner ativo' : 'Ativando camera...'}
          </div>
        </div>

        <div className="bg-white text-gray-900 rounded-2xl shadow-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <p className="font-semibold text-sm">Registro com biometria</p>
            </div>
            <span className="text-xs text-gray-500">{currentMatch?.confidence ? `${currentMatch.confidence}%` : ''}</span>
          </div>

          {currentMatch?.user ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {currentMatch.user.avatar_url ? (
                  <img src={currentMatch.user.avatar_url} alt={currentMatch.user.nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentMatch.user.nome}</p>
                <p className="text-sm text-gray-600">Matricula {currentMatch.user.matricula}</p>
                <p className="text-xs text-gray-500">{currentMatch.user.funcao || currentMatch.user.role}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500">
              Aguardando reconhecimento de um usuario conhecido.
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Como voce esta se sentindo hoje?</p>
            <div className="grid grid-cols-1 gap-2">
              {emotionButtons.map(([key, estado]) => (
                <button
                  key={key}
                  onClick={() => setSelectedEmotion(key as EstadoEmocional)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left ${
                    selectedEmotion === key
                      ? `${estado.borderColor} ${estado.bgColor}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{estado.emoji}</span>
                  <div className="flex flex-col">
                    <span className={`font-semibold ${selectedEmotion === key ? estado.color : 'text-gray-900'}`}>
                      {estado.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Observacoes (opcional)</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={3}
            />
          </div>

          <button
            onClick={submitEmociograma}
            disabled={!currentMatch?.user || !selectedEmotion || saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-60 hover:bg-emerald-700 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smile className="h-4 w-4" />}
            Registrar emociograma
          </button>
        </div>
      </div>
    </div>
  )
}
