import { CardBack, CardFront } from './TarotCard'

const POSITIONS = ['Passado', 'Presente', 'Futuro']
const FAN_SIZE = 21 // cartas visíveis no leque

// Leque de versos: a pessoa escolhe 3 cartas do baralho baralhado.
export default function FanSpread({ deck, picked, onPick }) {
  const fan = deck.slice(0, FAN_SIZE)
  const spreadDeg = 110
  return (
    <div className="reading-spread">
      <div className="fan-wrap">
        {fan.map((card, i) => {
          const angle = -spreadDeg / 2 + (spreadDeg / (FAN_SIZE - 1)) * i
          const isPicked = picked.some((p) => p.id === card.id)
          return (
            <CardBack
              key={card.id}
              className={`fan-card ${isPicked ? 'picked' : ''}`}
              style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
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
