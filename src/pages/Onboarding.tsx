import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Field, Logo, NumInput } from '../components/ui'
import PaymentModal from '../components/PaymentModal'
import { Finance, Goal, Payment, addDays, iso } from '../engine/finance'
import { emptyFinance } from '../data/seed'
import { useStore } from '../store'
import { Plus, Trash2 } from 'lucide-react'

export default function Onboarding() {
  const { state, dispatch } = useStore(); const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(state.session?.name ?? '')
  const [balance, setBalance] = useState(0)
  const [inc, setInc] = useState<Finance['income']>({ amount: 0, freq: 'monthly', dayOfMonth: 1 })
  const [essential, setEssential] = useState(0)
  const [payments, setPayments] = useState<Payment[]>([])
  const [goals, setGoals] = useState<Goal[]>([{ id: 'g1', name: 'Emergency fund', target: 50000, current: 0, deadline: iso(addDays(new Date(), 365)) }])
  const [margin, setMargin] = useState(0), [horizon, setHorizon] = useState(30), [cap, setCap] = useState<number | ''>(20)
  const [adding, setAdding] = useState(false), [errs, setErrs] = useState<Record<string, string>>({})
  if (!state.session) return <Navigate to="/login" replace />

  const validate = () => {
    const e: Record<string, string> = {}
    if (step === 0) { if (name.trim().length < 2) e.name = 'Enter your name.'; if (!(balance >= 0)) e.balance = 'Enter your current balance (₹0 or more).' }
    if (step === 1) { if (!(inc.amount >= 0)) e.amount = 'Enter your income (₹0 if none).'; if (inc.freq === 'monthly' && !(inc.dayOfMonth >= 1 && inc.dayOfMonth <= 31)) e.day = 'Pick a day between 1 and 31.' }
    if (step === 2 && !(essential >= 0)) e.essential = 'Enter an estimate (₹0 or more).'
    if (step === 3) { if (!(margin >= 0)) e.margin = 'Safety buffer cannot be negative.'; if (cap !== '' && (cap < 0 || cap > 100)) e.cap = 'Cap must be between 0 and 100%.'; if (goals.some(g => !g.name.trim() || !(g.target > 0))) e.goals = 'Each goal needs a name and a target above ₹0.' }
    setErrs(e); return !Object.keys(e).length
  }
  const next = () => validate() && setStep(s => s + 1)
  const finish = () => {
    if (!validate()) return
    const f: Finance = { ...emptyFinance(), openingBalance: balance, income: inc, essentialMonthly: essential, payments, goals: goals.map(g => ({ ...g, current: Number.isFinite(g.current) ? g.current : 0 })), settings: { safetyMargin: margin, horizonDays: horizon, capPct: cap === '' ? null : cap / 100, capAbsolute: null } }
    dispatch({ t: 'setFin', fin: f, onboarded: true })
    nav('/dashboard')
  }
  const sample = () => { dispatch({ t: 'loadSample', persona: 'salaried' }); nav('/dashboard') }
  const setGoal = (i: number, p: Partial<Goal>) => setGoals(g => g.map((x, j) => (j === i ? { ...x, ...p } : x)))

  return (
    <div className="authwrap"><div className="atmos" />
      <div className="authcard glass" style={{ width: 'min(640px,100%)' }}>
        <div className="logo" style={{ paddingLeft: 0 }}><Logo /></div>
        <div className="steps-dots" aria-label={`Step ${step + 1} of 4`}>{[0, 1, 2, 3].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <p className="hint" style={{ marginBottom: 14 }}>Synthetic/demo prototype — enter approximate figures. No bank account is connected.</p>

        {step === 0 && <div className="stack"><h2>About you</h2>
          <Field label="Your name" id="o-name" error={errs.name}><input id="o-name" className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Current balance (₹)" id="o-bal" error={errs.balance} hint="Money available in your main account today."><NumInput id="o-bal" value={balance} onChange={setBalance} /></Field></div>}

        {step === 1 && <div className="stack"><h2>Income</h2>
          <Field label="Income amount (₹)" id="o-inc" error={errs.amount}><NumInput id="o-inc" value={inc.amount} onChange={n => setInc({ ...inc, amount: n })} /></Field>
          <Field label="How often?" id="o-freq" hint="Irregular income is counted conservatively (70%)."><select id="o-freq" className="input" value={inc.freq} onChange={e => setInc({ ...inc, freq: e.target.value as Finance['income']['freq'] })}><option value="monthly">Monthly (fixed)</option><option value="weekly">Weekly (fixed)</option><option value="irregular">Irregular — amount is a monthly average</option></select></Field>
          {inc.freq === 'monthly' && <Field label="Usual credit day of month" id="o-day" error={errs.day}><NumInput id="o-day" min={1} step={1} value={inc.dayOfMonth} onChange={n => setInc({ ...inc, dayOfMonth: n })} /></Field>}</div>}

        {step === 2 && <div className="stack"><h2>Expenses &amp; payments</h2>
          <Field label="Everyday essentials per month (₹)" id="o-ess" error={errs.essential} hint="Groceries, transport, basic health. Do NOT include rent, bills or EMIs — add those below so nothing is counted twice."><NumInput id="o-ess" value={essential} onChange={setEssential} /></Field>
          <div className="row between"><span className="label">Recurring commitments &amp; upcoming obligations</span><button type="button" className="btn sm" onClick={() => setAdding(true)}><Plus size={14} />Add</button></div>
          {payments.length === 0 ? <div className="empty">No payments yet. Add rent, bills, EMIs or subscriptions.</div> :
            <div className="list">{payments.map(p => <div className="item" key={p.id}><div><b>{p.name}</b><div className="hint">{p.category} · {p.kind === 'recurring' ? `monthly on day ${p.dayOfMonth}` : `due ${p.dueDate}`}</div></div>
              <div className="row"><b className="num">₹{p.amount.toLocaleString('en-IN')}</b><button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => setPayments(x => x.filter(y => y.id !== p.id))}><Trash2 size={16} /></button></div></div>)}</div>}
          {adding && <PaymentModal onClose={() => setAdding(false)} onSave={p => { setPayments(x => [...x, p]); setAdding(false) }} />}</div>}

        {step === 3 && <div className="stack"><h2>Goals &amp; safety</h2>
          {goals.map((g, i) => <div key={g.id} className="grid g2" style={{ alignItems: 'end' }}>
            <Field label="Goal name" id={`g-n${i}`}><input id={`g-n${i}`} className="input" value={g.name} onChange={e => setGoal(i, { name: e.target.value })} /></Field>
            <Field label="Target (₹)" id={`g-t${i}`}><NumInput id={`g-t${i}`} value={g.target} onChange={n => setGoal(i, { target: n })} /></Field>
            <Field label="Saved so far (₹)" id={`g-c${i}`}><NumInput id={`g-c${i}`} value={g.current} onChange={n => setGoal(i, { current: n })} /></Field>
            <Field label="Deadline" id={`g-d${i}`}><input id={`g-d${i}`} type="date" className="input" value={g.deadline} onChange={e => setGoal(i, { deadline: e.target.value })} /></Field></div>)}
          {errs.goals && <div className="err">{errs.goals}</div>}
          <button type="button" className="btn sm" onClick={() => setGoals(g => [...g, { id: 'g' + Date.now(), name: '', target: 10000, current: 0, deadline: iso(addDays(new Date(), 180)) }])}><Plus size={14} />Add goal</button>
          <div className="grid g2">
            <Field label="Safety buffer (₹)" id="o-mg" error={errs.margin} hint="Always kept untouched."><NumInput id="o-mg" value={margin} onChange={setMargin} /></Field>
            <Field label="Planning horizon" id="o-h"><select id="o-h" className="input" value={horizon} onChange={e => setHorizon(Number(e.target.value))}>{[7, 14, 21, 30, 45, 60].map(h => <option key={h} value={h}>{h} days</option>)}</select></Field></div>
          <Field label="Optional cap (% of balance)" id="o-cap" error={errs.cap} hint="Leave empty for no cap."><input id="o-cap" className="input num" type="number" min={0} max={100} value={cap} onChange={e => setCap(e.target.value === '' ? '' : Number(e.target.value))} /></Field></div>}

        <div className="row between" style={{ marginTop: 24 }}>
          {step > 0 ? <button className="btn ghost" onClick={() => { setErrs({}); setStep(s => s - 1) }}>Back</button> : <button className="btn ghost" onClick={sample}>Use sample data</button>}
          {step < 3 ? <button className="btn primary" onClick={next}>Continue</button> : <button className="btn primary" onClick={finish}>Finish setup</button>}
        </div>
      </div>
    </div>
  )
}
