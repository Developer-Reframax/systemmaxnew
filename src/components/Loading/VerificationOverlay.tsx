'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

const DEFAULT_STEPS = [
  'Avaliando usuário',
  'Verificando permissões',
  'Validando termos e conformidade',
  'Carregando preferências do painel',
  'Preparando seu ambiente'
]

interface VerificationOverlayProps {
  steps?: string[]
}

export default function VerificationOverlay({ steps = DEFAULT_STEPS }: VerificationOverlayProps) {
  const normalizedSteps = useMemo(
    () => (steps.length > 0 ? steps : DEFAULT_STEPS),
    [steps]
  )
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % normalizedSteps.length)
    }, 1400)

    return () => clearInterval(interval)
  }, [normalizedSteps.length])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-200/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-8 py-10 text-white shadow-[0_30px_90px_rgba(8,15,40,0.65)]">
        <div className="absolute -top-28 right-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -bottom-28 left-0 h-64 w-64 rounded-full bg-blue-500/20 blur-[120px]" />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200 shadow-[0_0_24px_rgba(68,216,255,0.35)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
                Sistema em verificação
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Estamos preparando seu acesso
              </h2>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {normalizedSteps.map((step, index) => {
                const isActive = index === activeIndex
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      isActive
                        ? 'border-cyan-300/70 bg-cyan-400/10 text-white shadow-[0_0_18px_rgba(68,216,255,0.2)]'
                        : 'border-white/10 bg-white/5 text-white/70'
                    }`}
                    aria-live={isActive ? 'polite' : undefined}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isActive ? 'bg-cyan-300 animate-pulse' : 'bg-white/30'
                      }`}
                    />
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/70">
                Isso pode levar alguns segundos. Obrigado por aguardar enquanto garantimos
                a segurança do seu acesso.
              </p>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-cyan-200/80">
                <span className="h-2 w-2 animate-ping rounded-full bg-cyan-300" />
                Sincronizando dados do usuário...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
