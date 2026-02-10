import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-middleware'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

type PoseKey = 'front' | 'right' | 'left'

interface EnrollmentPayload {
  descriptors?: Partial<Record<PoseKey, number[] | Float32Array>>
  snapshots?: Partial<Record<PoseKey, string>>
  modelVersion?: string
}

const REQUIRED_POSES: PoseKey[] = ['front', 'right', 'left']

const isValidDescriptor = (value?: number[] | Float32Array) => {
  if (!value) return false
  const vector = Array.isArray(value) ? value : Array.from(value)
  return vector.length >= 64
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Nao autorizado' },
        { status: authResult.status || 401 }
      )
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select(
        'matricula, face_descriptors, face_snapshots, face_enrollment_status, face_last_enrolled_at, face_model_version'
      )
      .eq('matricula', authResult.user.matricula)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: 'Usuario nao encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        matricula: data.matricula,
        status: data.face_enrollment_status || 'inativo',
        hasTemplates: Boolean(data.face_descriptors),
        lastEnrolledAt: data.face_last_enrolled_at,
        modelVersion: data.face_model_version,
        snapshots: data.face_snapshots || null
      }
    })
  } catch (error) {
    console.error('Erro no GET /api/face/enrollment:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyJWTToken(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, message: authResult.error || 'Nao autorizado' },
        { status: authResult.status || 401 }
      )
    }

    const body = (await request.json()) as EnrollmentPayload
    const { descriptors, snapshots, modelVersion } = body

    if (!descriptors) {
      return NextResponse.json(
        { success: false, message: 'Descritores nao enviados' },
        { status: 400 }
      )
    }

    const missingPose = REQUIRED_POSES.find((pose) => !isValidDescriptor(descriptors[pose]))
    if (missingPose) {
      return NextResponse.json(
        { success: false, message: `Capture obrigatoria faltando: ${missingPose}` },
        { status: 400 }
      )
    }

    const sanitizedSnapshots =
      snapshots &&
      Object.entries(snapshots).reduce<Partial<Record<PoseKey, string>>>((acc, [key, value]) => {
        if (value && typeof value === 'string' && value.startsWith('data:image')) {
          acc[key as PoseKey] = value
        }
        return acc
      }, {})

    const { data, error } = await supabase
      .from('usuarios')
      .update({
        face_descriptors: {
          front: descriptors.front,
          right: descriptors.right,
          left: descriptors.left
        },
        face_snapshots: sanitizedSnapshots || null,
        face_enrollment_status: 'ativo',
        face_last_enrolled_at: new Date().toISOString(),
        face_model_version: modelVersion || 'face-api@1.7.12-ssd'
      })
      .eq('matricula', authResult.user.matricula)
      .select(
        'matricula, face_enrollment_status, face_last_enrolled_at, face_model_version, face_snapshots'
      )
      .single()

    if (error || !data) {
      console.error('Erro ao salvar biometria:', error)
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar biometria facial' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        matricula: data.matricula,
        status: data.face_enrollment_status,
        lastEnrolledAt: data.face_last_enrolled_at,
        modelVersion: data.face_model_version,
        snapshots: data.face_snapshots || null
      }
    })
  } catch (error) {
    console.error('Erro no POST /api/face/enrollment:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
