// VLT2-005: decisão de renovar a idempotency_key isolada aqui (sem dependências),
// para ser testável em Node sem carregar o cliente Supabase.
//
// Renova SÓ quando o servidor liberou a reserva (falha da IA, reserva expirada ou
// já liberada). Numa falha AMBÍGUA (rede/sem código) NÃO se renova: manter a
// chave preserva a idempotência caso o servidor tenha, na verdade, concluído.
const RELEASED_CODES = new Set(['reading_failed', 'reservation_released', 'reservation_expired'])

export function shouldRenewIdempotencyKey(code) {
  return RELEASED_CODES.has(code)
}
