import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Plus, Wallet, TrendingUp, Receipt, CalendarClock, PiggyBank, ShieldCheck } from 'lucide-react'
import { useStore } from '../store'
import { BrakePill, ChartTip, Disclaimer, Empty, brakeColor } from '../components/ui'
import PaymentModal from '../components/PaymentModal'
import { buildInsights, iso, parse, projection } from '../engine/finance'

export default function Dashboard() {
  const { fin, d, state, dispatch, money } = useStore()
  const [adding, setAdding] = useState(false)
  const r = d.result, h = fin.settings.horizonDays
  const name = state.session?.demo ? 'there' : state.session?.name.split(' ')[0]
  const pts = projection(fin, d)
  const insights = buildInsights(fin, d).slice(0, 4)
  const reserved = r.breakdown.filter(b => b.sign === -1)
  const total = Math.max(1, d.balance + d.expectedIncome)
  const seg = [...reserved.map((b, i) => ({ label: b.label, v: b.value, c: ['#5b6b86', '#6f7fa0', '#8a7cd6', '#b9a3ff'][i] })), { label: 'Safe-to-Save', v: r.safeAmount, c: brakeColor(r.state) }]
  const stats = [
    { l: 'Available balance', v: d.balance, I: Wallet }, { l: `Expected income (${h}d)`, v: d.expectedIncome, I: TrendingUp },
    { l: `Essential expenses (${h}d)`, v: d.essentials, I: Receipt }, { l: 'Upcoming obligations', v: d.obligationsTotal + d.recurringTotal, I: CalendarClock },
    { l: 'Current savings', v: d.savingsTotal, I: PiggyBank }, { l: 'Remaining safe funds', v: r.safeAmount, I: ShieldCheck },
  ]
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div><div className="muted">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><h1>Hello, {name} 👋</h1></div>
        <div className="muted num">Balance <b style={{ color: 'var(--text)' }}>{money(d.balance)}</b> · {d.upcoming.length} payments in {h} days</div>
      </div>

      <section className="hero-card glass" aria-labelledby="sts">
        <div className="stack" style={{ gap: 14, position: 'relative' }}>
          <div className="row between wrap"><span className="eyebrow" id="sts">Safe-to-Save</span><BrakePill state={r.state} /></div>
          <div className="big num" style={{ color: brakeColor(r.state) }}>{money(r.recommended)}</div>
          <div className="muted">Planning horizon: <b style={{ color: 'var(--text)' }}>{h} days</b> · Last calculated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · <span className="mint">Up to date</span></div>
          <div className="row" style={{ gap: 3, height: 10 }} role="img" aria-label="How your available funds are allocated">
            {seg.filter(s => s.v > 0).map(s => <span key={s.label} title={`${s.label}: ${money(s.v)}`} style={{ flex: s.v / total, background: s.c, height: '100%', borderRadius: 4, minWidth: 3 }} />)}
          </div>
          <div className="row wrap" style={{ gap: 12 }}>{seg.map(s => <span key={s.label} className="hint row" style={{ gap: 5 }}><span className="dot" style={{ color: s.c }} />{s.label}</span>)}</div>
        </div>
        <div className="stack" style={{ gap: 10, position: 'relative' }}>
          <h3>Why this amount?</h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }} className="muted">{r.reasons.map(x => <li key={x}>{x}</li>)}</ul>
          <div className="row wrap"><Link className="btn sm" to="/calculator">Open calculator</Link><Link className="btn sm ghost" to="/goals">Plan contributions</Link></div>
          <Disclaimer />
        </div>
      </section>

      <div className="grid g3" role="list">
        {stats.map(s => <div className="stat" role="listitem" key={s.l}><div className="row" style={{ gap: 8 }}><s.I size={15} className="mint" /><span className="l">{s.l}</span></div><div className="v num">{money(s.v)}</div></div>)}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', alignItems: 'start' }} id="dash-grid">
        <section className="card" aria-labelledby="cf"><div className="card-head"><h3 id="cf">Cash-flow outlook · next {h} days</h3><span className="hint">Projection, not a guarantee</span></div>
          <div className="chartwrap" role="img" aria-label={`Projected balance falls or rises across the next ${h} days; starts at ${money(d.balance)}, ends near ${money(pts[pts.length - 1].balance)}.`}>
            <ResponsiveContainer>
              <ComposedChart data={pts} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="ba" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#73F5BC" stopOpacity=".35" /><stop offset="1" stopColor="#73F5BC" stopOpacity="0" /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#98A3B5" fontSize={11} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis stroke="#98A3B5" fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={v => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip content={<ChartTip fmt={n => '₹' + Math.round(n).toLocaleString('en-IN')} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="balance" name="Projected balance" stroke="#73F5BC" strokeWidth={2.2} fill="url(#ba)" />
                <Bar dataKey="income" name="Income" fill="#37D6C0" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="payments" name="Payments due" fill="#FF7C86" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card" aria-labelledby="up"><div className="card-head"><h3 id="up">Upcoming payments</h3><button className="btn sm" onClick={() => setAdding(true)}><Plus size={14} />Add</button></div>
          {d.upcoming.length === 0 ? <Empty title="Nothing due in this horizon">Add rent, bills or EMIs to protect them.</Empty> :
            <div className="list" style={{ maxHeight: 340, overflow: 'auto' }}>{d.upcoming.map(o => {
              const days = Math.round((o.date.getTime() - new Date(iso(d.today)).getTime()) / 86400000)
              return <div className="item" key={o.payment.id + iso(o.date)}>
                <div><b>{o.payment.name}</b><div className="hint"><span className="chip">{o.payment.category}</span> {o.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {days <= 0 ? 'today' : `in ${days}d`}</div></div>
                <div className="row"><b className="num">{money(o.payment.amount)}</b><button className="icon-btn" title="Mark as paid" aria-label={`Mark ${o.payment.name} as paid`} onClick={() => dispatch({ t: 'markPaid', id: o.payment.id, date: iso(o.date) })}><CheckCircle2 size={17} /></button></div></div>
            })}</div>}
        </section>
      </div>
      {adding && <PaymentModal onClose={() => setAdding(false)} onSave={p => { dispatch({ t: 'setFin', fin: { ...fin, payments: [...fin.payments, p] } }); setAdding(false) }} />}

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card" aria-labelledby="gl"><div className="card-head"><h3 id="gl">Savings goals</h3><Link className="btn sm ghost" to="/goals">Manage</Link></div>
          {fin.goals.length === 0 ? <Empty title="No goals yet">Create one on the Goals page.</Empty> : <div className="stack" style={{ gap: 18 }}>{fin.goals.slice(0, 4).map(g => {
            const p = Math.min(100, Math.round((g.current / g.target) * 100)), s = d.suggestions[g.id] ?? 0
            return <div key={g.id}><div className="row between"><b>{g.name}</b><span className="num muted">{p}%</span></div>
              <div className="bar" style={{ margin: '8px 0' }} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={g.name}><i style={{ width: `${p}%` }} /></div>
              <div className="row between hint"><span className="num">{money(g.current)} of {money(g.target)}</span><span>{s > 0 ? `Suggested: ${money(s)}` : r.state === 'PAUSE' ? 'Paused by brake' : ''}</span></div></div>
          })}</div>}
        </section>

        <section className="card" aria-labelledby="ins"><div className="card-head"><h3 id="ins">Financial insights</h3><Link className="btn sm ghost" to="/insights">All insights</Link></div>
          {insights.length === 0 ? <Empty title="Not enough data yet">Add transactions to unlock insights.</Empty> : <div className="stack" style={{ gap: 10 }}>{insights.map(i => <div key={i.title} className={`insight ${i.tone}`}><div><b>{i.title}</b><p className="muted" style={{ fontSize: 13.5 }}>{i.body}</p></div></div>)}</div>}
        </section>
      </div>

      <section className="card" aria-labelledby="tx"><div className="card-head"><h3 id="tx">Recent activity</h3><Link className="btn sm ghost" to="/transactions">View all</Link></div>
        {fin.txns.length === 0 ? <Empty title="No transactions yet">Add one on the Transactions page.</Empty> : <div className="list">{fin.txns.slice(0, 6).map(t => <div className="item" key={t.id}>
          <div className="row"><span className={`avatar ${t.type === 'expense' ? 'out' : ''}`}>{t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</span><div><b>{t.desc}</b><div className="hint">{parse(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {t.category}{t.estimated && ' (est.)'}</div></div></div>
          <b className={`num ${t.type === 'income' ? 'mint' : ''}`}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</b></div>)}</div>}
      </section>
      <style>{`@media (max-width:1020px){#dash-grid{grid-template-columns:minmax(0,1fr)!important}}`}</style>
    </div>
  )
}
