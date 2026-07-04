import { supabase } from './supabase'

// baralha o baralho completo (Fisher–Yates)
export function shuffleDeck(cards) {
  const deck = cards.map((c) => ({ ...c, reversed: Math.random() < 0.35 }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export async function fetchCards() {
  const { data, error } = await supabase.from('cards').select('*').order('id')
  if (error) throw error
  return data
}

// chama a Edge Function; devolve {reading} ou lança erro com .code
export async function generateReading(question, chosen) {
  const { data: { session } } = await supabase.auth.getSession()
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-reading`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        question,
        cards: chosen.map((c) => ({ card_id: c.id, reversed: c.reversed })),
      }),
    }
  )
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const err = new Error(body.error || 'erro')
    err.code = resp.status === 402 ? 'quota_exceeded' : body.error || 'erro'
    throw err
  }
  return body.reading
}

// quantas leituras já fez esta semana (segunda-feira como início)
export async function readingsThisWeek(userId) {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('readings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monday.toISOString())
  if (error) throw error
  return count ?? 0
}
