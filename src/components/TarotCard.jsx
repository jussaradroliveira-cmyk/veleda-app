import { useState } from 'react'

// Resolve imagens públicas contra o BASE_URL (em produção o site vive em /veleda-app/)
const img = (path) => import.meta.env.BASE_URL + String(path).replace(/^\//, '')

// Usa a estrutura nova mesmo enquanto image_path ainda não tiver sido atualizado no banco.
function frontPath(card) {
  if (!card?.slug) return card?.image_path
  const inferredSuit = ['copas', 'ouros', 'espadas', 'paus'].find((suit) => card.slug.endsWith(`-de-${suit}`))
  const folder = card.arcana === 'maior' || (!card.suit && !inferredSuit) ? 'maiores' : card.suit || inferredSuit
  return folder ? `/cards/${folder}/${card.slug}.webp` : card.image_path
}

// Frente da carta: tenta a imagem real; se não existir, mostra o placeholder com moldura dourada.
export function CardFront({ card, className = '' }) {
  const [imgOk, setImgOk] = useState(true)
  const imagePath = frontPath(card)
  return (
    <div
      className={`tarot-card ${card.reversed ? 'reversed' : ''} ${className}`}
      title={`${card.name}${card.reversed ? ' — invertida' : ''}`}
    >
      {imgOk && imagePath ? (
        <img src={img(imagePath)} alt={card.name} onError={() => setImgOk(false)} />
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

// Verso da carta: tenta /cards/verso.webp; senão, padrão rosa/dourado.
export function CardBack({ style, onClick, className = '' }) {
  const [imgOk, setImgOk] = useState(true)
  return (
    <div className={`tarot-card ${className}`} style={style} onClick={onClick}>
      {imgOk ? (
        <img src={img('/cards/verso.webp')} alt="verso da carta" onError={() => setImgOk(false)} />
      ) : (
        <div className="card-back"><span className="orn">✦</span></div>
      )}
    </div>
  )
}
