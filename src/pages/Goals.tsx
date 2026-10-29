import { useState } from 'react'
import { Pencil, Plus, Trash2, PiggyBank } from 'lucide-react'
import { useStore } from '../store'
import { BrakePill, Disclaimer, Empty, Field, Modal, NumInput } from '../components/ui'
import { Goal, addDays, daysBetween, iso, parse } from '../engine/finance'

function GoalModal({ goal, onSave, onClose }: { goal?: Goal; onSave: (g: Goal) => void; onClose: () => void }) {
  const [name, setName] = useState(goal?.name ?? ''), [target, setTarget] = useState(goal?.target ?? 10000), [current, setCurrent] = useState(goal?.current ?? 0), [deadline, setDeadline] = useState(goal?.deadline ?? iso(addDays(new Date(), 180)))
  const [er, setEr] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); const x: Record<string, string> = {}
    if (!name.trim()) x.name = 'Name your goal.'
    if (!(target > 0)) x.target = 'Target must be above ₹0.'
    if (!(current >= 0) || current > target) x.current = 'Saved amount must be between ₹0 and the target.'
    if (!deadline || parse(deadline) <= new Date()) x.deadline = 'Pick a future deadline.'
    setEr(x); if (Object.keys(x).length) return
    onSave({ id: goal?.id ?? 'g' + Date.now(), name: name.trim(), target, current, deadline })
  }
  return <Modal title={goal ? 'Edit goal' : 'New goal'} onClose={onClose}><form className="stack" onSubmit={submit} noValidate>
    <Field label="Goal name" id="gm-n" error={er.name}><input id="gm-n" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Emergency fund, Education, Travel…" /></Field>
    <div className="grid g2"><Field label="Target (₹)" id="gm-t" error={er.target}><NumInput id="gm-t" value={target} onChange={setTarget} /></Field><Field label="Saved so far (₹)" id="gm-c" error={er.current}><NumInput id="gm-c" value={current} onChange={setCurrent} /></Field></div>
    <Field label="Deadline" id="gm-d" error={er.deadline}><input id="gm-d" className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
    <button className="btn primary">{goal ? 'Save goal' : 'Create goal'}</button></form></Modal>
}

export default function Goals() {
  const { fin, d, dispatch, money } = useStore()
  const [edit, setEdit] = useState<Goal | 'new' | null>(null)
  const r = d.result
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Savings goals</h1><p className="muted">Contributions are split from today's brake-limited recommendation, so they never exceed what is safe.</p></div><button className="btn primary" onClick={() => setEdit('new')}><Plus size={16} />New goal</button></div>
      <div className="glass row between wrap" style={{ padding: '16px 22px', borderRadius: 20 }}><div><div className="eyebrow">Available to allocate now</div><div className="num" style={{ fontSize: 28, fontWeight: 800 }}>{money(r.recommended)}</div></div><BrakePill state={r.state} />
        {r.state === 'PAUSE' && <p className="coral" style={{ flexBasis: '100%' }}>Saving is paused, so no contributions are suggested until your position recovers.</p>}</div>
      {fin.goals.length === 0 ? <Empty title="No goals yet">Create an emergency fund, education or travel goal to get started.</Empty> :
        <div className="grid g2">{fin.goals.map(g => {
          const p = Math.min(100, Math.round((g.current / g.target) * 100)), s = d.suggestions[g.id] ?? 0, days = daysBetween(d.today, parse(g.deadline)), done = g.current >= g.target
          return <article className="card stack" key={g.id} style={{ gap: 12 }} aria-label={g.name}>
            <div className="row between"><div className="row"><span className="avatar"><PiggyBank size={18} /></span><div><h3>{g.name}</h3><div className="hint">{done ? 'Goal reached 🎉' : days > 0 ? `${days} days left · by ${parse(g.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Deadline passed'}</div></div></div>
              <div className="row" style={{ gap: 4 }}><button className="icon-btn" aria-label={`Edit ${g.name}`} onClick={() => setEdit(g)}><Pencil size={15} /></button><button className="icon-btn" aria-label={`Delete ${g.name}`} onClick={() => dispatch({ t: 'deleteGoal', id: g.id })}><Trash2 size={15} /></button></div></div>
            <div className="bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.name} progress`}><i style={{ width: `${p}%` }} /></div>
            <div className="row between"><span className="num"><b>{money(g.current)}</b> <span className="muted">of {money(g.target)}</span></span><b className="num mint">{p}%</b></div>
            <div className="row between wrap" style={{ gap: 8 }}><span className="hint">{done ? '' : s > 0 ? `Suggested now: ${money(s)}` : r.state === 'PAUSE' ? 'No contribution — brake is paused' : 'No safe contribution suggested'}</span>
              {!done && s > 0 && <button className="btn sm primary" onClick={() => dispatch({ t: 'contribute', id: g.id, amount: s })}>Record {money(s)} saved</button>}</div>
          </article>
        })}</div>}
      <p className="hint">“Record saved” logs a savings transfer in your transactions and updates this tracker — FlowMint never moves or invests real money.</p><Disclaimer />
      {edit && <GoalModal goal={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSave={g => { dispatch({ t: 'upsertGoal', goal: g }); setEdit(null) }} />}
    </div>
  )
}
