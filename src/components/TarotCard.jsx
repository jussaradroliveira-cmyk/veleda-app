import { useState } from 'react'

// Frente da carta: tenta a imagem real; se não existir, mostra o placeholder com moldura dourada.
export function CardFront({ card, className = '' }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className={`tarot-card ${card.reversed ? 'reversed' : ''} ${className}`} title={card.name}>
      {imgOk && card.image_path ? (
        <img src={card.image_path} alt={card.name} onError={() => setImgOk(false)} />
      ) : (
        <div className="card-face-inner">
          <div className="num">{card.arcana === 'maior' ? `ARCANO ${card.number}` : card.suit?.toUpperCase()}</div>
          <div className="orn">✦</div>
          <div className="nome">{card.name}</div>
          <div className="orn">✧</div>
        </div>
      )}
    </div>
  )
}

// Verso da carta: tenta /cards/verso.jpg; senão, padrão rosa/dourado.
export function CardBack({ style, onClick, className = '' }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className={`tarot-card ${className}`} style={style} onClick={onClick}>
      {imgOk ? (
        <img src="/cards/verso.jpg" alt="verso da carta" onError={() => setImgOk(false)} />
      ) : (
        <div className="card-back"><span className="orn">✦</span></div>
      )}
    </div>
  )
}
