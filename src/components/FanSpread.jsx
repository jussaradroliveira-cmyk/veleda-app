import { useMemo } from 'react'
import { CardBack, CardFront } from './TarotCard'

const POSITIONS = ['Passado', 'Presente', 'Futuro']

// Leque de versos: a pessoa escolhe 3 cartas do baralho embaralhado.
export default function FanSpread({ deck, picked, onPick }) {
  // menos cartas e arco mais fechado em ecrãs estreitos, para o toque ser confortável
  const narrow = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches,
    []
  )
  const fanSize = narrow ? 17 : 21
  const spreadDeg = narrow ? 60 : 110
  const fan = deck.slice(0, fanSize)

  return (
    <div className="reading-spread">
      <div className="fan-wrap">
        {fan.map((card, i) => {
          const angle = -spreadDeg / 2 + (spreadDeg / (fanSize - 1)) * i
          const isPicked = picked.some((p) => p.id === card.id)
          return (
            <CardBack
              key={card.id}
              className={`fan-card ${isPicked ? 'picked' : ''}`}
              style={{ '--fan-angle': `${angle}deg` }}
              onClick={() => !isPicked && picked.length < 3 && onPick(card)}
            />
          )
        })}
      </div>
      <div className="spread-divider" aria-hidden="true"><span>✦</span></div>
      <div className="spread-slots">
        {POSITIONS.map((label, i) => (
          <div className="slot" key={label}>
            <div className="slot-label">{label}</div>
            {picked[i] ? (
              <CardFront card={picked[i]} className="flip-in" />
            ) : (
              <div className="placeholder-slot">✧</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
