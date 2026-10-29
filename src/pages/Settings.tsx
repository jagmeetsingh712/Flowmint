import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Field, NumInput } from '../components/ui'
import { PERSONAS } from '../data/seed'
import { Persona } from '../engine/finance'

export default function SettingsPage() {
  const { state, fin, dispatch } = useStore(); const nav = useNavigate()
  const s = fin.settings
  const [persona, setPersona] = useState<Persona>(fin.persona)
  const [name, setName] = useState(state.session?.name ?? '')
  const [saved, setSaved] = useState('')
  const setS = (patch: Partial<typeof s>) => dispatch({ t: 'settings', patch })
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Settings &amp; privacy</h1></div></div>
      <section className="card stack" aria-labelledby="pf"><h3 id="pf">Profile</h3>
        <div className="grid g2"><Field label="Name" id="s-n"><input id="s-n" className="input" value={name} onChange={e => setName(e.target.value)} onBlur={() => state.session && dispatch({ t: 'login', session: { ...state.session, name: name.trim() || state.session.name } })} /></Field>
          <Field label="Email" id="s-e"><input id="s-e" className="input" value={state.session?.demo ? 'Demo mode (no account)' : state.session?.email} readOnly /></Field></div></section>

      <section className="card stack" aria-labelledby="ps"><h3 id="ps">Plan settings</h3>
        <div className="grid g3">
          <Field label="Safety margin (₹)" id="s-m" hint="Always kept untouched."><NumInput id="s-m" value={s.safetyMargin} onChange={n => Number.isFinite(n) && setS({ safetyMargin: n })} /></Field>
          <Field label="Planning horizon" id="s-h"><select id="s-h" className="input" value={s.horizonDays} onChange={e => setS({ horizonDays: Number(e.target.value) })}>{[7, 14, 21, 30, 45, 60].map(h => <option key={h} value={h}>{h} days</option>)}</select></Field>
          <Field label="Cap (% of balance)" id="s-c" hint="Empty = no cap."><input id="s-c" className="input num" type="number" min={0} max={100} value={s.capPct == null ? '' : Math.round(s.capPct * 100)} onChange={e => setS({ capPct: e.target.value === '' ? null : Math.min(1, Math.max(0, Number(e.target.value) / 100)) })} /></Field></div>
        <div className="grid g2"><Field label="Everyday essentials / month (₹)" id="s-es" hint="Excludes rent, bills and EMIs (tracked as payments)."><NumInput id="s-es" value={fin.essentialMonthly} onChange={n => Number.isFinite(n) && dispatch({ t: 'setFin', fin: { ...fin, essentialMonthly: n } })} /></Field></div>
        <div className="hint">Defaults are documented design parameters, not research findings: irregular income is counted at 70%; "Reduce" triggers when reserved outflows use ≥60% of funds or a cap binds.</div></section>

      <section className="card stack" aria-labelledby="dp"><h3 id="dp">Display</h3>
        <label className="row"><input type="checkbox" checked={state.prefs.hideBalances} onChange={e => dispatch({ t: 'prefs', prefs: { hideBalances: e.target.checked } })} /> Hide amounts (privacy mode)</label>
        <label className="row"><input type="checkbox" checked={state.prefs.reduceMotion} onChange={e => dispatch({ t: 'prefs', prefs: { reduceMotion: e.target.checked } })} /> Reduce motion</label></section>

      <section className="card stack" aria-labelledby="dd"><h3 id="dd">Demo data</h3>
        <p className="muted">Reset to reproducible synthetic data (fixed random seed).</p>
        <div className="row wrap"><select className="input" style={{ width: 'auto' }} aria-label="Persona" value={persona} onChange={e => setPersona(e.target.value as Persona)}>{(Object.keys(PERSONAS) as Persona[]).map(k => <option key={k} value={k}>{PERSONAS[k].label}</option>)}</select>
          <button className="btn" onClick={() => { dispatch({ t: 'loadSample', persona }); setSaved('Demo data reset.') }}>Reset demo data</button></div>
        {saved && <div className="mint" role="status">{saved}</div>}</section>

      <section className="card stack" aria-labelledby="pv"><h3 id="pv">How your data is handled</h3>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>Everything is stored only in this browser (localStorage). There is no server or database in this prototype.</li>
          <li>FlowMint does not connect to bank accounts and never asks for banking passwords, UPI PINs or OTPs.</li>
          <li>Demo transactions are synthetic; automatic categories are keyword-based estimates.</li>
          <li>Recommendations are estimates, not financial advice. Nothing is transferred or invested automatically.</li></ul>
        <div><button className="btn danger" onClick={() => { if (confirm('Delete all FlowMint data stored in this browser, including local accounts?')) { try { localStorage.removeItem('flowmint.accounts') } catch { /* */ } dispatch({ t: 'wipe' }); nav('/') } }}><Trash2 size={16} />Delete all local data</button></div></section>
    </div>
  )
}
