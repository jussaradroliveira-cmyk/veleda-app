import { useI18n } from '../lib/i18n-context'

const STEPS = [
  { key: 'nome', labelKey: 'steps.you' },
  { key: 'pergunta', labelKey: 'steps.question' },
  { key: 'tiragem', labelKey: 'steps.cards' },
  { key: 'leitura', labelKey: 'steps.reading' },
]

// Linha de progresso do ritual: Você ✦ Pergunta ✦ Cartas ✦ Leitura.
export default function StepIndicator({ current }) {
  const { t } = useI18n()
  const currentIndex = STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="step-indicator" aria-label={t('steps.aria')}>
      {STEPS.map((step, i) => (
        <li
          key={step.key}
          className={i === currentIndex ? 'is-current' : i < currentIndex ? 'is-done' : ''}
          aria-current={i === currentIndex ? 'step' : undefined}
        >
          <span>{t(step.labelKey)}</span>
        </li>
      ))}
    </ol>
  )
}
