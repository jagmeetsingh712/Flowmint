import { ReactNode, useEffect, useRef } from 'react'
import { BrakeState } from '../engine/safeToSave'
import { ShieldCheck, ShieldAlert, PauseCircle, X } from 'lucide-react'

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#73F5BC" /><stop offset="1" stopColor="#37D6C0" /></linearGradient></defs>
        <path d="M16 3l10 7.5v11L16 29 6 21.5v-11z" fill="url(#lg)" /><path d="M16 3l10 7.5-10 6-10-6z" fill="#fff" opacity=".35" />
      </svg>
      <span>Flow<span className="mint">Mint</span></span>
    </span>
  )
}

const BRAKE = {
  NORMAL: { cls: 'normal', label: 'Normal', Icon: ShieldCheck, note: 'Healthy position' },
  REDUCE: { cls: 'reduce', label: 'Reduce', Icon: ShieldAlert, note: 'Smaller amount advised' },
  PAUSE: { cls: 'pause', label: 'Pause', Icon: PauseCircle, note: 'Saving paused' },
} as const
export function BrakePill({ state }: { state: BrakeState }) {
  const b = BRAKE[state]
  return <span className={`pill ${b.cls}`} role="status" aria-label={`Financial Safety Brake: ${b.label}`}><b.Icon size={14} />Brake: {b.label}</span>
}
export const brakeColor = (s: BrakeState) => (s === 'NORMAL' ? 'var(--mint)' : s === 'REDUCE' ? 'var(--amber)' : 'var(--coral)')

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input,select,button')?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); prev?.focus() }
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="card-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}{hint && !error && <span className="hint">{hint}</span>}{error && <span className="err" role="alert">{error}</span>}</div>
}

/** Numeric input that keeps raw text while typing and reports a parsed number. */
export function NumInput({ id, value, onChange, min = 0, step = 100, ...rest }: { id: string; value: number; onChange: (n: number) => void; min?: number; step?: number } & Record<string, unknown>) {
  return <input id={id} className="input num" type="number" inputMode="decimal" min={min} step={step} value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} {...rest} />
}

export function ChartTip({ active, payload, label, fmt }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tt">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.name} className="row" style={{ gap: 8, justifyContent: 'space-between' }}><span style={{ color: p.color }}>● {p.name}</span><b className="num">{fmt(p.value)}</b></div>)}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}>{title}</div>{children}</div>
}

export const Disclaimer = () => <p className="hint">FlowMint recommendations are estimates based on the figures you provide — not financial advice. No money is moved automatically.</p>
