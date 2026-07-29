export const READING_LIMITS = Object.freeze({
  maxBodyBytes: 16_384,
  maxQuestionChars: 500,
  maxConcurrentPerUser: 2,
  maxPerMinutePerUser: 5,
  maxPerHourPerUser: 20,
  maxPerDayPremium: 100,
  maxGlobalReservationsPerDay: 5_000,
  freePerWeek: 1,
  reservationTtlSeconds: 180,
  idempotencyKeyMaxChars: 128,
  // Semana civil: segunda 00:00 até segunda 00:00, sempre em UTC.
  // Uma regra única evita conceder duas quotas ao mudar de mercado/fuso.
  quotaTimeZone: 'UTC',
})

export function validIdempotencyKey(value) {
  return typeof value === 'string' &&
    value.length >= 16 &&
    value.length <= READING_LIMITS.idempotencyKeyMaxChars &&
    /^[A-Za-z0-9._:-]+$/.test(value)
}

export function utcWeekStart(date = new Date()) {
  const value = new Date(date)
  const day = (value.getUTCDay() + 6) % 7
  value.setUTCDate(value.getUTCDate() - day)
  value.setUTCHours(0, 0, 0, 0)
  return value
}

export function validateReadingPayload(rawLength, body) {
  if (rawLength > READING_LIMITS.maxBodyBytes) return 'payload_too_large'
  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!question || question.length > READING_LIMITS.maxQuestionChars) return 'invalid_question'
  if (!Array.isArray(body?.cards) || body.cards.length !== 3) return 'invalid_cards'
  if (!validIdempotencyKey(body?.idempotency_key)) return 'invalid_idempotency_key'
  return null
}
