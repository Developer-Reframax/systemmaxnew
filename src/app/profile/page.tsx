'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import MainLayout from '@/components/Layout/MainLayout'
import {
  User,
  Mail,
  Phone,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  Brain,
  Sparkles,
  Loader2,
  CheckCircle2,
  Play,
  Square,
  Smile
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  nome: string
  email: string
  telefone: string
  avatar_url?: string
}

type PoseKey = 'front' | 'right' | 'left'

interface FaceEnrollmentStatus {
  status: 'pendente' | 'ativo' | 'inativo'
  hasTemplates: boolean
  lastEnrolledAt?: string | null
  modelVersion?: string | null
  snapshots?: Partial<Record<PoseKey, string | null>>
}

type FaceDetectionBox = { x: number; y: number; width: number; height: number }
type FaceDetectionResult = {
  detection: { box: FaceDetectionBox }
  descriptor: Float32Array
}
type FaceDetectionOptions = Record<string, unknown>
type FaceApiInstance = {
  nets: {
    ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void> }
    faceLandmark68Net: { loadFromUri: (url: string) => Promise<void> }
    faceRecognitionNet: { loadFromUri: (url: string) => Promise<void> }
    faceExpressionNet: { loadFromUri: (url: string) => Promise<void> }
  }
  SsdMobilenetv1Options: new (options?: { minConfidence?: number }) => FaceDetectionOptions
  detectSingleFace: (
    input: HTMLVideoElement,
    options?: FaceDetectionOptions | null
  ) => {
    withFaceLandmarks: () => {
      withFaceDescriptor: () => Promise<FaceDetectionResult | null>
    }
  }
}
type FaceApiWindow = Window & { faceapi?: FaceApiInstance }

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model'

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({ nome: '', email: '', telefone: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [faceStatus, setFaceStatus] = useState<FaceEnrollmentStatus>({
    status: 'pendente',
    hasTemplates: false,
    snapshots: {}
  })
  const [faceLoading, setFaceLoading] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [captureStep, setCaptureStep] = useState<PoseKey>('front')
  const [faceCaptures, setFaceCaptures] = useState<Record<PoseKey, string | null>>({
    front: null,
    right: null,
    left: null
  })
  const [faceDescriptors, setFaceDescriptors] = useState<Record<PoseKey, Float32Array | null>>({
    front: null,
    right: null,
    left: null
  })
  const [faceStatusMessage, setFaceStatusMessage] = useState<string>('Pronto para ativar')
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionOptionsRef = useRef<FaceDetectionOptions | null>(null)
  const poseLabels: Record<PoseKey, string> = {
    front: 'Frente',
    right: 'Direita',
    left: 'Esquerda'
  }

  const loadProfile = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticao no encontrado')
        return
      }

      const response = await fetch(`/api/users/${user.matricula}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Erro ao carregar perfil')
      const data = await response.json()
      const fetched = data.user || data

      setProfile({
        nome: fetched.nome || '',
        email: fetched.email || '',
        telefone: fetched.telefone || fetched.phone || ''
      })

      if (fetched.avatar_url) setAvatarPreview(fetched.avatar_url)
    } catch (error) {
      console.error('Erro ao carregar perfil:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadFaceStatus = useCallback(async () => {
    if (!user) return
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      const response = await fetch('/api/face/enrollment', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) return
      const data = await response.json()
      const enrollment = data.enrollment || {}

      setFaceStatus({
        status: enrollment.status || 'pendente',
        hasTemplates: Boolean(enrollment.hasTemplates),
        lastEnrolledAt: enrollment.lastEnrolledAt || null,
        modelVersion: enrollment.modelVersion || null,
        snapshots: enrollment.snapshots || {}
      })

      if (enrollment.snapshots) {
        setFaceCaptures((prev) => ({
          ...prev,
          front: enrollment.snapshots.front || prev.front,
          right: enrollment.snapshots.right || prev.right,
          left: enrollment.snapshots.left || prev.left
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar status facial:', error)
    }
  }, [user])

  const stopFaceStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
    setVideoReady(false)
  }, [])

  useEffect(() => {
    if (user) {
      loadProfile()
      loadFaceStatus()
    }
  }, [user, loadProfile, loadFaceStatus])

  useEffect(() => {
    return () => {
      stopFaceStream()
    }
  }, [stopFaceStream])

  const ensureFaceApiScript = async (): Promise<FaceApiInstance | null> => {
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

    return typedWindow.faceapi || null
  }

  const loadFaceModels = async (): Promise<FaceApiInstance> => {
    const faceapi = await ensureFaceApiScript()
    if (!faceapi) throw new Error('face-api indisponvel')

    if (!modelsReady) {
      setFaceStatusMessage('Carregando modelos neurais...')
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      detectionOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
      setModelsReady(true)
      setFaceStatusMessage('Modelos carregados, capture a pose')
    } else if (!detectionOptionsRef.current) {
      detectionOptionsRef.current = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
    }

    return faceapi
  }

  const waitForVideoFrame = async (): Promise<boolean> => {
    const video = videoRef.current
    if (!video) return false

    for (let i = 0; i < 12; i += 1) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true)
        return true
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    const ready = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    setVideoReady(ready)
    return ready
  }

  const attachStreamToVideo = () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return

    video.srcObject = stream
    video.muted = true
    video.onloadedmetadata = async () => {
      try {
        await video.play()
        setVideoReady(true)
      } catch (err) {
        console.error('Erro ao iniciar vdeo da cmera:', err)
        setVideoReady(true)
      }
    }
    video
      .play()
      .then(() => {
        setVideoReady(true)
      })
      .catch((err) => {
        console.error('Erro ao dar play no vdeo:', err)
        setVideoReady(true)
      })
  }

  const startFaceCapture = async () => {
    try {
      setFaceLoading(true)
      // Liga a cmera primeiro para j mostrar o preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      })

      setCameraReady(true)
      setVideoReady(false)
      setFaceStatusMessage('Cmera ativa, alinhe o rosto para capturar')

      streamRef.current = stream
      attachStreamToVideo()
      if (!videoRef.current) {
        requestAnimationFrame(() => attachStreamToVideo())
      }
      setCaptureStep('front')
      setFaceDescriptors({ front: null, right: null, left: null })
      setFaceCaptures({ front: null, right: null, left: null })
      setFaceStatusMessage('Olhe para frente e alinhe o rosto ao quadro')

      // Aguarda um frame para garantir que o video vai aparecer
      await waitForVideoFrame().catch(() => setVideoReady(true))

      // Carrega modelos apos a camera estar ativa (nao bloqueia o preview)
      loadFaceModels().catch((err) => {
        console.error('Erro ao carregar modelos faciais:', err)
        setFaceStatusMessage('Falha ao carregar modelos, revise sua conexao')
        toast.error('Modelos de reconhecimento nao carregaram')
      })
    } catch (error) {
      console.error('Erro ao iniciar captura facial:', error)
      toast.error('Nao foi possivel acessar a camera')
      setCameraReady(false)
      setVideoReady(false)
    } finally {
      setFaceLoading(false)
    }
  }

  const submitFaceEnrollment = async () => {
    if (!faceDescriptors.front || !faceDescriptors.right || !faceDescriptors.left) {
      toast.error('Capture as 3 poses para ativar o reconhecimento.')
      return
    }

    try {
      setFaceLoading(true)
      setFaceStatusMessage('Gerando template seguro...')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticao no encontrado')
        return
      }

      const response = await fetch('/api/face/enrollment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          descriptors: {
            front: Array.from(faceDescriptors.front),
            right: Array.from(faceDescriptors.right),
            left: Array.from(faceDescriptors.left)
          },
          snapshots: faceCaptures,
          modelVersion: 'face-api@1.7.12-ssd-mobilenet'
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar biometria')
      const data = await response.json()

      setFaceStatus({
        status: data.enrollment?.status || 'ativo',
        hasTemplates: true,
        lastEnrolledAt: data.enrollment?.lastEnrolledAt || new Date().toISOString(),
        modelVersion: data.enrollment?.modelVersion || 'face-api@1.7.12-ssd-mobilenet',
        snapshots: faceCaptures
      })

      toast.success('Reconhecimento facial ativado com sucesso!')
      stopFaceStream()
    } catch (error) {
      console.error('Erro ao salvar biometria facial:', error)
      toast.error('No foi possvel salvar o reconhecimento facial')
    } finally {
      setFaceLoading(false)
    }
  }

  const captureCurrentPose = async () => {
    try {
      setFaceLoading(true)
      if (!cameraReady) {
        await startFaceCapture()
        return
      }

      const faceapi = await loadFaceModels()
      if (!faceapi || !videoRef.current || !detectionOptionsRef.current) {
        throw new Error('Cmera no disponvel')
      }

      if (videoRef.current.readyState < 2 || !videoReady) {
        await videoRef.current.play().catch(() => undefined)
        await waitForVideoFrame()
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, detectionOptionsRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        toast.error('No detectamos um rosto ntido. Ajuste a luz e tente novamente.')
        return
      }

      const descriptor = new Float32Array(detection.descriptor)
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const targetWidth = 720
      const ratio = video.videoHeight && video.videoWidth ? video.videoHeight / video.videoWidth : 9 / 16
      canvas.width = targetWidth
      canvas.height = Math.round(targetWidth * ratio)

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
      setFaceDescriptors((prev) => ({ ...prev, [captureStep]: descriptor }))
      setFaceCaptures((prev) => ({ ...prev, [captureStep]: dataUrl }))

      const nextStep = captureStep === 'front' ? 'right' : captureStep === 'right' ? 'left' : null
      if (nextStep) {
        setCaptureStep(nextStep)
        setFaceStatusMessage(nextStep === 'right' ? 'Gire suavemente para a direita' : 'Gire suavemente para a esquerda')
      } else {
        await submitFaceEnrollment()
      }
    } catch (error) {
      console.error('Erro na captura facial:', error)
      toast.error('No foi possvel capturar essa pose. Ajuste a iluminao e tente de novo.')
    } finally {
      setFaceLoading(false)
    }
  }

  const formatEnrollmentDate = (value?: string | null) => {
    if (!value) return 'Nunca cadastrado'
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    } catch {
      return value
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no mximo 5MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem vlida')
      return
    }
    setAvatarFile(file)

    const reader = new FileReader()
    reader.onload = (evt) => setAvatarPreview(evt.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticao no encontrado')
        return null
      }
      const formData = new FormData()
      formData.append('avatar', avatarFile)
      formData.append('matricula', user.matricula.toString())

      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (!response.ok) throw new Error('Erro ao fazer upload do avatar')
      const data = await response.json()
      return data.avatar_url
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error)
      toast.error('Erro ao fazer upload da imagem')
      return null
    }
  }

  const saveProfile = async () => {
    if (!user) return
    try {
      setSaving(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) {
        toast.error('Token de autenticao no encontrado')
        return
      }

      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const uploaded = await uploadAvatar()
        if (uploaded) avatarUrl = uploaded
      }

      const response = await fetch(`/api/users/${user.matricula}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: profile.email,
          telefone: profile.telefone,
          phone: profile.telefone,
          avatar_url: avatarUrl
        })
      })

      if (!response.ok) throw new Error('Erro ao salvar perfil')
      setIsEditing(false)
      setAvatarFile(null)
      toast.success('Perfil atualizado com sucesso!')
      loadProfile()
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(profile.avatar_url || null)
    loadProfile()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Editar Perfil
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          {/* Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                )}
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{profile.nome || 'Nome no informado'}</h2>
                <p className="text-blue-100">{profile.email}</p>
                <div className="flex items-center mt-2">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {user?.role === 'Admin' ? 'Administrador' : user?.role === 'Editor' ? 'Editor' : 'Usurio'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações Pessoais</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={profile.nome}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Digite seu email"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.email || 'No informado'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Telefone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profile.telefone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, telefone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="(11) 99999-9999"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.telefone || 'No informado'}</p>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Informações da Conta</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Dados</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Matrícula: {user?.matricula}</p>
                    <p>Função: {user?.funcao || user?.role}</p>
                    <p>Status: {user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border border-blue-100/70 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-blue-100/60 dark:border-gray-700 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-700 dark:text-emerald-200 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  IA em tempo real
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reconhecimento facial + emoções</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Capture 3 poses (frente, direita, esquerda) para ativar a autenticao facial vinculada a sua matrcula.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  faceStatus.hasTemplates && faceStatus.status === 'ativo'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}
              >
                {faceStatus.hasTemplates && faceStatus.status === 'ativo' ? 'Ativo e treinado' : 'Pendente de captura'}
              </span>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <p className="font-semibold text-gray-900 dark:text-white">Último treino</p>
                <p>{formatEnrollmentDate(faceStatus.lastEnrolledAt)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 grid md:grid-cols-5 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-lg border border-blue-100/80 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Checklist de captura</span>
                  </div>
                  <span className="text-xs text-blue-700 dark:text-emerald-200">
                    Modelo {faceStatus.modelVersion || 'face-api@1.7.12'}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(Object.keys(poseLabels) as PoseKey[]).map((pose) => (
                    <div
                      key={pose}
                      className={`rounded-md border p-3 text-sm font-semibold text-gray-800 dark:text-gray-200 ${
                        faceCaptures[pose]
                          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/40'
                          : captureStep === pose
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/40'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">{poseLabels[pose]}</p>
                      <p className="mt-1">
                        {faceCaptures[pose]
                          ? 'Capturada'
                          : captureStep === pose
                          ? 'Agora'
                          : 'Aguardando'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Smile className="h-4 w-4 text-emerald-500" />
                  <span>{faceStatusMessage}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startFaceCapture}
                    disabled={faceLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {faceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {faceStatus.hasTemplates ? 'Regravar biometria' : 'Ativar reconhecimento facial'}
                  </button>
                  <button
                    onClick={captureCurrentPose}
                    disabled={faceLoading || !cameraReady}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-100 bg-white/70 dark:bg-gray-800 text-sm font-semibold hover:border-blue-400 transition-colors disabled:opacity-50"
                  >
                    {faceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Capturar pose
                  </button>
                  {cameraReady && (
                    <button
                      onClick={stopFaceStream}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Square className="h-4 w-4" />
                      Parar câmera
                    </button>
                  )}
                  <Link
                    href="/reconhecimento-facial"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100"
                  >
                    <Shield className="h-4 w-4" />
                    Abrir central de reconhecimento
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(poseLabels) as PoseKey[]).map((pose) => (
                  <div
                    key={pose}
                    className="group relative h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    {faceCaptures[pose] ? (
                      <img src={faceCaptures[pose] || ''} alt={poseLabels[pose]} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                        {poseLabels[pose]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-2">
                      <span className="text-xs font-semibold text-white">{poseLabels[pose]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-3 relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl border border-blue-500/20">
              {!cameraReady && (
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.18),transparent_32%)]" />
              )}
              {cameraReady ? (
                <video
                  ref={videoRef}
                  className="w-full h-full min-h-[320px] object-cover relative z-10 bg-black/40"
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => {
                    setVideoReady(true)
                    setCameraReady(true)
                  }}
                />
              ) : (
                <div className="min-h-[320px] flex flex-col items-center justify-center text-white relative z-10 space-y-2">
                  <div className="p-3 rounded-full bg-white/10 backdrop-blur">
                    <Camera className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-semibold">Câmera pronta para iniciar</p>
                  <p className="text-sm text-blue-100 max-w-md text-center">
                    Ilumine bem o ambiente, mantenha o rosto alinhado e sem obstruções para obter um template mais preciso.
                  </p>
                </div>
              )}
              <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none" />
              {cameraReady && (
                <div className="absolute bottom-4 left-0 right-0 px-4 z-20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white text-sm bg-black/30 px-3 py-2 rounded-lg backdrop-blur">
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    <span>Passo atual: {poseLabels[captureStep]}</span>
                  </div>
                  <button
                    onClick={captureCurrentPose}
                    disabled={faceLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 text-gray-900 text-sm font-semibold shadow-lg hover:bg-white"
                  >
                    {faceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    Capturar esta pose
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}



