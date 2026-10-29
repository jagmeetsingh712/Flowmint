import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store'
import { ChartTip, Empty } from '../components/ui'
import { buildInsights, categoryBreakdown, detectRecurring, forecastWeeklyExpenses, incomeVariability, monthlyTrend, addDays } from '../engine/finance'

const COLORS = ['#73F5BC', '#37D6C0', '#9fb4ff', '#b9a3ff', '#F6C66A', '#FF7C86', '#7dd3fc', '#a7f3d0']
const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

export default function Insights() {
  const { fin, d, money } = useStore()
  const cats = categoryBreakdown(fin.txns, d.today, 30)
  const trend = monthlyTrend(fin.txns, d.today, 4)
  const fc = forecastWeeklyExpenses(fin.txns, d.today)
  const rec = detectRecurring(fin.txns)
  const iv = incomeVariability(fin.txns, d.today)
  const insights = buildInsights(fin, d)
  const wk = fc.ok ? [...fc.history.slice(-8).map((v, i, a) => ({ label: `W-${a.length - i}`, actual: Math.round(v) as number | null, forecast: null as number | null })), ...fc.forecast!.map((v, i) => ({ label: `W+${i + 1}`, actual: null, forecast: v as number | null }))] : []
  if (fc.ok) { const last = wk[fc.history.slice(-8).length - 1]; last.forecast = last.actual }
  const hasData = fin.txns.length > 0
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Insights &amp; forecasting</h1><p className="muted">Everything here is derived from your transactions and plan — and labelled honestly where it is an estimate.</p></div></div>
      <section className="card" aria-labelledby="ai"><div className="card-head"><h3 id="ai">Plain-language insights</h3></div>
        {insights.length === 0 ? <Empty title="No insights yet">Add transactions and payments to see trends.</Empty> : <div className="grid g2">{insights.map(i => <div key={i.title} className={`insight ${i.tone}`}><div><b>{i.title}</b><p className="muted" style={{ fontSize: 13.5 }}>{i.body}</p></div></div>)}</div>}
      </section>

      {!hasData ? <Empty title="Charts need transaction history">Add transactions (or load sample history from the Transactions page).</Empty> : <>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card" aria-labelledby="mt"><div className="card-head"><h3 id="mt">Income vs expenses by month</h3><span className="hint">Latest month is partial</span></div>
          <div className="chartwrap" role="img" aria-label="Bar chart of monthly income and expenses"><ResponsiveContainer><BarChart data={trend.map(t => ({ ...t, label: t.partial ? `${t.label}*` : t.label }))}>
            <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="label" stroke="#98A3B5" fontSize={12} tickLine={false} /><YAxis stroke="#98A3B5" fontSize={11} tickLine={false} axisLine={false} width={46} tickFormatter={v => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<ChartTip fmt={fmt} />} cursor={{ fill: 'rgba(255,255,255,.04)' }} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Income" fill="#73F5BC" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="Expenses" fill="#FF7C86" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>

        <section className="card" aria-labelledby="cb"><div className="card-head"><h3 id="cb">Spending by category · last 30 days</h3><span className="hint">Estimated categories</span></div>
          {cats.length === 0 ? <Empty title="No spending in the last 30 days" /> : <div className="chartwrap" role="img" aria-label={`Category spending; largest is ${cats[0].category}`}><ResponsiveContainer><BarChart data={cats} layout="vertical" margin={{ left: 18 }}>
            <XAxis type="number" hide /><YAxis type="category" dataKey="category" stroke="#98A3B5" fontSize={12} tickLine={false} axisLine={false} width={92} />
            <Tooltip content={<ChartTip fmt={fmt} />} cursor={{ fill: 'rgba(255,255,255,.04)' }} /><Bar dataKey="value" name="Spent" radius={[0, 6, 6, 0]}>{cats.map((c, i) => <Cell key={c.category} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div>}</section>
      </div>

      <section className="card" aria-labelledby="fc"><div className="card-head"><h3 id="fc">Weekly spending forecast</h3><span className="pill">Statistical baseline · not a trained ML model</span></div>
        {!fc.ok ? <Empty title="Not enough history">{fc.reason}</Empty> : <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', alignItems: 'center' }} id="fc-grid">
          <div className="chartwrap" role="img" aria-label={`Weekly expenses with a flat ${fmt(fc.forecast![0])} forecast for the next four weeks`}><ResponsiveContainer><LineChart data={wk}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="label" stroke="#98A3B5" fontSize={11} tickLine={false} /><YAxis stroke="#98A3B5" fontSize={11} tickLine={false} axisLine={false} width={46} tickFormatter={v => `${Math.round(v / 1000)}k`} />
            <Tooltip content={<ChartTip fmt={fmt} />} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line dataKey="actual" name="Actual" stroke="#73F5BC" strokeWidth={2.2} dot={{ r: 3 }} connectNulls={false} /><Line dataKey="forecast" name="Forecast" stroke="#F6C66A" strokeDasharray="6 5" strokeWidth={2.2} dot={{ r: 3 }} connectNulls={false} /></LineChart></ResponsiveContainer></div>
          <div className="stack" style={{ gap: 8 }}><div><div className="eyebrow">Selected method</div><b>{fc.method}</b></div>
            <div className="hint">Held-out mean absolute error (last 5 weeks, one-step-ahead):</div>
            {Object.entries(fc.mae!).map(([k, v]) => <div key={k} className="row between"><span className={k === fc.method ? 'mint' : 'muted'}>{k}</span><b className="num">{fmt(v)}</b></div>)}
            <p className="hint">Computed on synthetic/demo data. These errors describe this dataset only and are not a claim of real-world accuracy.</p></div></div>}
      </section>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card" aria-labelledby="iv"><div className="card-head"><h3 id="iv">Income variability</h3></div>
          {iv ? <div className="stack" style={{ gap: 8 }}><div className="row between"><span className="muted">Average monthly income</span><b className="num">{money(iv.avg)}</b></div><div className="row between"><span className="muted">Range</span><b className="num">{money(iv.min)} – {money(iv.max)}</b></div>
            <div className="row between"><span className="muted">Variability (CV)</span><b className={`num ${iv.cv > 0.25 ? 'amber' : 'mint'}`}>{Math.round(iv.cv * 100)}% · {iv.cv > 0.25 ? 'irregular' : 'steady'}</b></div></div> : <Empty title="Need two full months of income history" />}
        </section>
        <section className="card" aria-labelledby="rc"><div className="card-head"><h3 id="rc">Detected recurring payments</h3><span className="hint">Rule-based</span></div>
          {rec.length === 0 ? <Empty title="None detected">Needs 3+ similar monthly payments.</Empty> : <div className="list">{rec.slice(0, 7).map(r => <div className="item" key={r.name}><div><b>{r.name}</b><div className="hint">{r.category} · seen {r.count}×, ~monthly</div></div><b className="num">{money(r.amount)}</b></div>)}</div>}
        </section>
      </div></>}
      <p className="hint">Upcoming obligations through {addDays(d.today, fin.settings.horizonDays).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} total {money(d.obligationsTotal + d.recurringTotal)} and are reserved before any recommendation.</p>
      <style>{`@media (max-width:1020px){#fc-grid{grid-template-columns:minmax(0,1fr)!important}}`}</style>
    </div>
  )
}
