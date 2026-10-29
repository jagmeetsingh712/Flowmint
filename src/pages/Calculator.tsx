import { useMemo, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { useStore } from '../store'
import { BrakePill, Disclaimer, Field, NumInput, brakeColor } from '../components/ui'
import { computeSafeToSave } from '../engine/safeToSave'

export default function CalculatorPage() {
  const { d, fin, dispatch, money } = useStore()
  const init = () => ({ ...d.input, capPct: d.input.capPctOfBalance == null ? NaN : Math.round(d.input.capPctOfBalance * 100), capAbs: d.input.capAbsolute ?? NaN, horizon: fin.settings.horizonDays })
  const [v, setV] = useState(init)
  const [saved, setSaved] = useState(false)
  const set = (k: keyof ReturnType<typeof init>) => (n: number) => { setSaved(false); setV(x => ({ ...x, [k]: n })) }
  const res = useMemo(() => computeSafeToSave({
    balance: v.balance, expectedIncome: v.expectedIncome, essentialExpenses: v.essentialExpenses, recurringCommitments: v.recurringCommitments,
    upcomingObligations: v.upcomingObligations, safetyMargin: v.safetyMargin, horizonDays: v.horizon,
    capPctOfBalance: Number.isFinite(v.capPct) ? v.capPct / 100 : null, capAbsolute: Number.isFinite(v.capAbs) ? v.capAbs : null,
  }), [v])
  const apply = () => { dispatch({ t: 'settings', patch: { safetyMargin: v.safetyMargin, horizonDays: v.horizon, capPct: Number.isFinite(v.capPct) ? v.capPct / 100 : null, capAbsolute: Number.isFinite(v.capAbs) ? v.capAbs : null } }); setSaved(true) }
  const total = res.breakdown.filter(b => b.sign === 1).reduce((s, b) => s + b.value, 0)
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head"><div><h1>Safe-to-Save calculator</h1><p className="muted">Edit any assumption and see the recommendation update instantly. Changes here are a what-if until you save them as plan settings.</p></div>
        <button className="btn sm" onClick={() => { setV(init()); setSaved(false) }}><RotateCcw size={14} />Reset to my data</button></div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }} id="calc-grid">
        <section className="card stack" aria-labelledby="ci"><h3 id="ci">Assumptions</h3>
          <div className="grid g2">
            <Field label="Available balance (₹)" id="c-bal"><NumInput id="c-bal" value={v.balance} onChange={set('balance')} /></Field>
            <Field label="Expected income (₹)" id="c-inc" hint="Within the planning horizon."><NumInput id="c-inc" value={v.expectedIncome} onChange={set('expectedIncome')} /></Field>
            <Field label="Essential expenses (₹)" id="c-ess"><NumInput id="c-ess" value={v.essentialExpenses} onChange={set('essentialExpenses')} /></Field>
            <Field label="Recurring commitments (₹)" id="c-rec"><NumInput id="c-rec" value={v.recurringCommitments} onChange={set('recurringCommitments')} /></Field>
            <Field label="Upcoming obligations (₹)" id="c-obl"><NumInput id="c-obl" value={v.upcomingObligations} onChange={set('upcomingObligations')} /></Field>
            <Field label="Safety margin (₹)" id="c-mg"><NumInput id="c-mg" value={v.safetyMargin} onChange={set('safetyMargin')} /></Field>
            <Field label="Planning horizon (days)" id="c-h"><NumInput id="c-h" min={1} step={1} value={v.horizon} onChange={set('horizon')} /></Field>
            <Field label="Cap (% of balance)" id="c-cp" hint="Empty = no percentage cap."><input id="c-cp" className="input num" type="number" min={0} max={100} value={Number.isFinite(v.capPct) ? v.capPct : ''} onChange={e => set('capPct')(e.target.value === '' ? NaN : Number(e.target.value))} /></Field>
            <Field label="Absolute cap (₹)" id="c-ca" hint="Optional. Stricter cap wins."><input id="c-ca" className="input num" type="number" min={0} value={Number.isFinite(v.capAbs) ? v.capAbs : ''} onChange={e => set('capAbs')(e.target.value === '' ? NaN : Number(e.target.value))} /></Field>
          </div>
          <p className="hint">Horizon is informational here: enter income and payments already scoped to it. On the dashboard they are derived from your dated payments automatically.</p>
          <button className="btn primary" onClick={apply} disabled={res.errors.length > 0}><Save size={16} />Save margin, horizon &amp; cap to my plan</button>
          {saved && <div className="mint" role="status">Saved. The dashboard now uses these plan settings.</div>}
        </section>

        <section className="glass stack" style={{ padding: 24, position: 'sticky', top: 16 }} aria-live="polite" aria-labelledby="cr">
          <div className="row between wrap"><h3 id="cr">Result</h3><BrakePill state={res.state} /></div>
          {res.errors.length > 0 ? <div className="err" role="alert">{res.errors.map(e => <div key={e}>{e.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>)}</div> : <>
            <div className="big num" style={{ color: brakeColor(res.state) }}>{money(res.recommended)}</div>
            <div className="muted">Safe amount before cap: <b className="num" style={{ color: 'var(--text)' }}>{money(res.safeAmount)}</b>{res.capApplied && <> · cap/limit applied at <b className="num">{money(res.capLimit)}</b></>}</div>
            <div className="list" role="table" aria-label="Calculation breakdown">
              {res.breakdown.map(b => <div className="item" role="row" key={b.label} style={{ padding: '8px 0' }}><span>{b.sign === 1 ? '+' : '−'} {b.label}</span><b className="num" style={{ color: b.sign === 1 ? 'var(--mint)' : 'var(--text)' }}>{money(b.value)}</b></div>)}
              <div className="item" role="row"><b>= Before zero floor</b><b className="num" style={{ color: res.rawSafe < 0 ? 'var(--coral)' : undefined }}>{res.rawSafe < 0 ? '−' : ''}{money(Math.abs(res.rawSafe))}</b></div>
            </div>
            <div className="hint">Total funds in play: {money(total)}</div>
            <div><h3 style={{ fontSize: 15, marginBottom: 6 }}>What influenced this</h3><ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }} className="muted">{res.reasons.map(x => <li key={x}>{x}</li>)}</ul></div></>}
          <Disclaimer />
        </section>
      </div>
      <style>{`@media (max-width:1020px){#calc-grid{grid-template-columns:minmax(0,1fr)!important}.glass[style*="sticky"]{position:static!important}}`}</style>
    </div>
  )
}
