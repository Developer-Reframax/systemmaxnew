import type { ReadinessEventInput, ReadinessMetrics, ReadinessRiskLevel } from '@/lib/types/readiness'

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const average = (values: number[]) => {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, value) => acc + value, 0)
  return sum / values.length
}

const calculateFatigueIndex = (events: ReadinessEventInput[]) => {
  const ordered = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const reactionTimes = ordered
    .map((event) => event.reaction_time_ms)
    .filter((time): time is number => typeof time === 'number')

  // Evita ruído quando há poucos eventos clicados
  if (reactionTimes.length < 8) {
    return 0
  }

  const quarter = Math.max(2, Math.floor(reactionTimes.length / 4))
  const early = reactionTimes.slice(0, quarter)
  const late = reactionTimes.slice(-quarter)
  const earlyAvg = average(early)
  const lateAvg = average(late)

  if (earlyAvg === 0) {
    return 0
  }

  // Limita o índice de fadiga para evitar explosões com amostras pequenas
  return Math.max(-50, Math.min(200, ((lateAvg - earlyAvg) / earlyAvg) * 100))
}

const classifyRisk = (
  score: number,
  omissionRate: number,
  commissionRate: number,
  fatigueIndex: number,
  stroopErrorRate: number
): ReadinessRiskLevel => {
  if (
    score < 70 ||
    omissionRate > 0.2 ||
    commissionRate > 0.2 ||
    fatigueIndex > 150 ||
    stroopErrorRate > 0.25
  ) {
    return 'ALTO_RISCO'
  }

  if (score >= 85 && omissionRate <= 0.15 && commissionRate <= 0.15 && fatigueIndex <= 100) {
    return 'APTO'
  }

  return 'ALERTA'
}

const calculateDuration = (events: ReadinessEventInput[], startedAt?: string, endedAt?: string) => {
  if (startedAt && endedAt) {
    return Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
  }

  if (events.length === 0) {
    return 0
  }

  const ordered = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  return Math.max(
    0,
    new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()
  )
}

export function calculateReadinessMetrics(
  events: ReadinessEventInput[],
  startedAt?: string,
  endedAt?: string
): ReadinessMetrics {
  const totalEvents = events.length || 1
  const reactionTimes = events
    .map((event) => event.reaction_time_ms)
    .filter((time): time is number => typeof time === 'number')

  const reaction_time_avg = average(reactionTimes)
  const omission_rate = events.filter((event) => event.error_type === 'OMISSAO').length / totalEvents
  const commission_rate = events.filter((event) => event.error_type === 'COMISSAO').length / totalEvents

  const stroopEvents = events.filter((event) => event.block_type === 'STROOP')
  const stroopErrors =
    stroopEvents.filter((event) => event.error_type === 'CONFLITO' || !event.is_correct).length || 0
  const stroop_error_rate =
    stroopEvents.length > 0 ? stroopErrors / stroopEvents.length : 0

  const fatigue_index = calculateFatigueIndex(events)

  let score = 100

  if (reaction_time_avg > 500) {
    const over = reaction_time_avg - 500
    // penalidade mais suave para tempos altos
    score -= Math.min(12, (over / 100) * 2)
  }

  score -= omission_rate * 80
  score -= commission_rate * 80
  score -= stroop_error_rate * 60

  if (omission_rate > 0.15) {
    score -= 20
  }

  if (commission_rate > 0.15) {
    score -= 20
  }

  const fatiguePenalty = Math.min(8, Math.max(0, fatigue_index) * 0.05)
  score -= fatiguePenalty

  const readiness_score = clampScore(score)
  const risk_level = classifyRisk(readiness_score, omission_rate, commission_rate, fatigue_index, stroop_error_rate)
  const total_duration_ms = calculateDuration(events, startedAt, endedAt)

  return {
    reaction_time_avg,
    omission_rate,
    commission_rate,
    stroop_error_rate,
    fatigue_index,
    readiness_score,
    risk_level,
    total_duration_ms
  }
}
