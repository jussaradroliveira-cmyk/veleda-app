const STEPS = [
  { key: 'nome', label: 'Você' },
  { key: 'pergunta', label: 'Pergunta' },
  { key: 'tiragem', label: 'Cartas' },
  { key: 'leitura', label: 'Leitura' },
]

// Linha de progresso do ritual: Você ✦ Pergunta ✦ Cartas ✦ Leitura.
export default function StepIndicator({ current }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="step-indicator" aria-label="Etapas da leitura">
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={i === currentIndex ? 'is-current' : i < currentIndex ? 'is-done' : ''}
          aria-current={i === currentIndex ? 'step' : undefined}
        >
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
