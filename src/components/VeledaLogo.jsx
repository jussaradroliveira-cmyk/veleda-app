import { Link } from 'react-router-dom'

export default function VeledaLogo({ className = '' }) {
  return (
    <Link className={`veleda-logo ${className}`.trim()} to="/" aria-label="Veleda Tarô — ir para o início">
      <img
        src={`${import.meta.env.BASE_URL}design/veleda-logo-final.png`}
        alt="Veleda — Tarô Simbólico"
      />
    </Link>
  )
}
