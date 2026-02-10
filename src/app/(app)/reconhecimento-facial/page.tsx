'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  Brain,
  Camera,
  Sparkles,
  Shield,
  AlertTriangle,
  Loader2,
  Smile,
  Activity,
  Radar,
  CheckCircle2
} from 'lucide-react'

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

interface MatchResult {
  label: string
  confidence: number
  user?: FaceTemplate
  timestamp: string
}

type FaceDetectionBox = { x: number; y: number; width: number; height: number }

type FaceDetectionResult = {
  detection: { box: FaceDetectionBox }
  descriptor: Float32Array
  expressions: Record<string, number>
}

type FaceApiDetectionOptions = { minConfidence?: number }

type FaceApiDetectionTask = {
  withFaceLandmarks(): FaceApiDetectionTask
  withFaceDescriptor(): FaceApiDetectionTask
  withFaceExpressions(): Promise<FaceDetectionResult | undefined>
}

type FaceApiMatcher = {
  findBestMatch(descriptor: Float32Array): { label: string; distance: number }
}

type FaceApiLabeledDescriptor = { label: string; descriptors: Float32Array[] }

type FaceApiInstance = {
  nets: {
    ssdMobilenetv1: { loadFromUri(uri: string): Promise<void> }
    faceLandmark68Net: { loadFromUri(uri: string): Promise<void> }
    faceRecognitionNet: { loadFromUri(uri: string): Promise<void> }
    faceExpressionNet: { loadFromUri(uri: string): Promise<void> }
  }
  SsdMobilenetv1Options: new (options?: FaceApiDetectionOptions) => FaceApiDetectionOptions
  LabeledFaceDescriptors: new (label: string, descriptors: Float32Array[]) => FaceApiLabeledDescriptor
  FaceMatcher: new (labeled: FaceApiLabeledDescriptor[], distance?: number) => FaceApiMatcher
  detectSingleFace(input: HTMLVideoElement, options?: FaceApiDetectionOptions): FaceApiDetectionTask
}

type FaceApiWindow = Window & { faceapi?: FaceApiInstance }

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'

export default function ReconhecimentoFacialPage() {
  const { user } = useAuth()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceApiRef = useRef<FaceApiInstance | null>(null)
  const detectionOptionsRef = useRef<FaceApiDetectionOptions | null>(null)
  const matcherRef = useRef<FaceApiMatcher | null>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [templates, setTemplates] = useState<FaceTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [streamReady, setStreamReady] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null)
  const [expressions, setExpressions] = useState<Record<string, number>>({})
  const [statusMessage, setStatusMessage] = useState('Carregando inteligência visual...')

  const fetchTemplates = useCallback(async (): Promise<FaceTemplate[]> => {
    if (!user) return []
    try {
      setLoadingTemplates(true)

      const response = await fetch('/api/face/templates', {
        method: 'GET'
      })

      if (!response.ok) {
        toast.error('Erro ao carregar templates faciais')
        return []
      }

      const data = await response.json()
      const mapped: FaceTemplate[] =
        data.templates?.map((template: FaceTemplate & { model_version?: string }) => ({
          matricula: template.matricula,
          nome: template.nome,
          email: template.email,
          funcao: template.funcao,
          role: template.role,
          avatar_url: template.avatar_url,
          descriptors: template.descriptors || {},
          modelVersion: template.modelVersion || template.model_version
        })) || []

      setTemplates(mapped)
      if (mapped.length === 0) {
        toast.info('Nenhum template facial ativo para seu contrato')
      }
      return mapped
    } catch (error) {
      console.error('Erro ao buscar templates faciais:', error)
      toast.error('Não foi possível carregar as faces cadastradas')
      return []
    } finally {
      setLoadingTemplates(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
    return () => {
      stopScanner()
    }
  }, [user, fetchTemplates])

  const ensureFaceApi = async () => {
    if (typeof window === 'undefined') return null
    const typedWindow = window as FaceApiWindow
    if (typedWindow.faceapi) return typedWindow.faceapi

    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js'
      script.async = true
      script.onload = resolve
      script.onerror = reject
      document.body.appendChild(script)
    })

    return (window as FaceApiWindow).faceapi ?? null
  }

  const loadModels = async () => {
    const faceapi = await ensureFaceApi()
    if (!faceapi) throw new Error('face-api não disponível')

    if (!modelsReady) {
      setStatusMessage('Carregando modelos de alta precisão...')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      detectionOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      setModelsReady(true)
    }

    faceApiRef.current = faceapi
    return faceapi
  }

  const buildMatcher = async (currentTemplates: FaceTemplate[]) => {
    const faceapi = await loadModels()
    const labeled = currentTemplates
      .map((template) => {
        const vectors = Object.values(template.descriptors || {})
          .filter(Boolean)
          .map((descriptor) => new Float32Array(descriptor as number[]))
        if (!vectors.length) return null
        return new faceapi.LabeledFaceDescriptors(String(template.matricula), vectors)
      })
      .filter((item): item is FaceApiLabeledDescriptor => Boolean(item))

    if (labeled.length === 0) {
      matcherRef.current = null
      return
    }

    matcherRef.current = new faceapi.FaceMatcher(labeled, 0.45)
  }

  const startScanner = async () => {
    try {
      setStatusMessage('Sincronizando câmera e IA...')
      let activeTemplates = templates
      if (!templates.length) {
        activeTemplates = await fetchTemplates()
      }
      await buildMatcher(activeTemplates)
      const faceapi = faceApiRef.current || (await loadModels())
      if (!faceapi) throw new Error('face-api indisponível')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      streamRef.current = stream
      setStreamReady(true)
      setStatusMessage('Detectando rostos em tempo real')
      detectLoop()
    } catch (error) {
      console.error('Erro ao iniciar scanner facial:', error)
      toast.error('Não foi possível iniciar a leitura da câmera')
    }
  }

  const stopScanner = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStreamReady(false)
    setCurrentMatch(null)
    setExpressions({})
  }

  const drawOverlay = (detection?: FaceDetectionResult) => {
    if (!canvasRef.current || !videoRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!detection) return

    const box = detection.detection.box
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 3
    ctx.strokeRect(box.x, box.y, box.width, box.height)
    ctx.fillStyle = 'rgba(34,197,94,0.2)'
    ctx.fillRect(box.x, box.y, box.width, box.height)
  }

  const detectLoop = async () => {
    const faceapi = faceApiRef.current
    if (!faceapi || !videoRef.current || !detectionOptionsRef.current) return

    const detection = await faceapi
      .detectSingleFace(videoRef.current, detectionOptionsRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions()

    drawOverlay(detection)

    if (detection && matcherRef.current) {
      const bestMatch = matcherRef.current.findBestMatch(detection.descriptor)
      const matchedUser =
        bestMatch?.label && bestMatch.label !== 'unknown'
          ? templates.find((t) => String(t.matricula) === bestMatch.label)
          : undefined

      setCurrentMatch({
        label: bestMatch?.label || 'unknown',
        confidence: bestMatch ? Math.round((1 - bestMatch.distance) * 100) : 0,
        user: matchedUser,
        timestamp: new Date().toISOString()
      })
      setExpressions(detection.expressions || {})
    } else {
      setExpressions({})
    }

    animationRef.current = requestAnimationFrame(detectLoop)
  }

  const topEmotions = Object.entries(expressions || {})
    .map(([key, value]) => ({ key, value: Math.round(value * 100) }))
    .filter((item) => item.value > 1)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-700 dark:text-emerald-200 font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Inteligência visual
            </p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de reconhecimento facial</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Identificação por biometria facial com leitura de emoções em tempo real.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Shield className="h-4 w-4" />
            Voltar ao perfil
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-blue-500/30 shadow-xl">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.18),transparent_32%)]" />
              <div className="aspect-video relative z-10">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                {!streamReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-3 bg-black/50 backdrop-blur">
                    <Camera className="h-10 w-10" />
                    <p className="text-lg font-semibold">Câmera aguardando inicialização</p>
                    <p className="text-sm text-blue-100 max-w-md text-center">
                      Garanta boa iluminação e enquadre apenas um rosto para resultados mais precisos.
                    </p>
                  </div>
                )}
              </div>

              <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 backdrop-blur text-white text-sm">
                <Brain className="h-4 w-4" />
                <span>{statusMessage}</span>
              </div>

              <div className="absolute bottom-4 left-0 right-0 px-4 z-20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white text-sm bg-black/30 px-3 py-2 rounded-lg backdrop-blur">
                  <Radar className="h-4 w-4 text-emerald-300" />
                  <span>{streamReady ? 'Scanner ativo' : 'Scanner pausado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startScanner}
                    disabled={loadingTemplates}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 text-gray-900 text-sm font-semibold shadow-lg hover:bg-white disabled:opacity-60"
                  >
                    {loadingTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Iniciar leitura
                  </button>
                  {streamReady && (
                    <button
                      onClick={stopScanner}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/50 text-white text-sm font-semibold hover:bg-white/10"
                    >
                      Parar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Identidade detectada</p>
                </div>
                <span className="text-xs text-gray-500">Threshold 0.45</span>
              </div>

              {currentMatch?.user ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                    {currentMatch.user.avatar_url ? (
                      <img src={currentMatch.user.avatar_url} alt={currentMatch.user.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Brain className="h-5 w-5 text-blue-700 dark:text-blue-200" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 dark:text-white leading-tight">{currentMatch.user.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Matrícula {currentMatch.user.matricula} • {currentMatch.user.funcao || currentMatch.user.role}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100 font-semibold">
                        {currentMatch.confidence}% confiança
                      </span>
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
                        {currentMatch.user.modelVersion || 'face-api@1.7.12'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span>Nenhuma correspondência ainda. Fique visível para a câmera.</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Smile className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Painel de emoções</p>
              </div>
              {topEmotions.length > 0 ? (
                <div className="space-y-3">
                  {topEmotions.map((emotion) => (
                    <div key={emotion.key}>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span className="capitalize">{emotion.key}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{emotion.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400"
                          style={{ width: `${emotion.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Emoções aguardando leitura...
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Status do motor</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${modelsReady ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  Modelos carregados
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${streamReady ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  Câmera ativa
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${matcherRef.current ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  Base de templates
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
  )
}
