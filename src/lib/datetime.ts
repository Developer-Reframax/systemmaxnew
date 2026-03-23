export function formatDateTimeFromDatabase(value?: string | null): string {
  if (!value) return '-'

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hour, minute] = match
    return `${day}/${month}/${year} ${hour}:${minute}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function extractDateKeyFromDatabase(value?: string | null): string {
  if (!value) return 'sem_data'

  const raw = String(value).trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return `${year}${month}${day}`
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return 'sem_data'
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
