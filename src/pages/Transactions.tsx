import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { Empty, Field, Modal, NumInput } from '../components/ui'
import { Category, EXPENSE_CATEGORIES, Txn, categorize, iso, parse } from '../engine/finance'

function TxnModal({ txn, onSave, onClose }: { txn?: Txn; onSave: (t: Txn) => void; onClose: () => void }) {
  const [desc, setDesc] = useState(txn?.desc ?? ''), [amount, setAmount] = useState(txn?.amount ?? 0), [type, setType] = useState<Txn['type']>(txn?.type ?? 'expense')
  const [date, setDate] = useState(txn?.date ?? iso(new Date())), [cat, setCat] = useState<Category | 'auto'>(txn && !txn.estimated ? txn.category : 'auto')
  const [er, setEr] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const x: Record<string, string> = {}
    if (!desc.trim()) x.desc = 'Describe the transaction.'
    if (!(amount > 0)) x.amount = 'Enter an amount above ₹0.'
    if (!date || parse(date) > new Date()) x.date = 'Choose today or an earlier date.'
    setEr(x); if (Object.keys(x).length) return
    const category: Category = type === 'income' ? 'Income' : cat === 'auto' ? categorize(desc) : cat
    onSave({ id: txn?.id ?? 't' + Date.now(), desc: desc.trim(), amount, type, date, category, estimated: type === 'expense' && cat === 'auto' })
  }
  return (
    <Modal title={txn ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="seg" role="group" aria-label="Type">{(['expense', 'income'] as const).map(t => <button type="button" key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t === 'expense' ? 'Expense' : 'Income'}</button>)}</div>
        <Field label="Description" id="t-d" error={er.desc}><input id="t-d" className="input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Zomato order" /></Field>
        <div className="grid g2"><Field label="Amount (₹)" id="t-a" error={er.amount}><NumInput id="t-a" value={amount} onChange={setAmount} step={10} /></Field>
          <Field label="Date" id="t-dt" error={er.date}><input id="t-dt" className="input" type="date" value={date} max={iso(new Date())} onChange={e => setDate(e.target.value)} /></Field></div>
        {type === 'expense' && <Field label="Category" id="t-c" hint={cat === 'auto' ? `Auto estimate: ${categorize(desc || '')} (keyword rules, not a bank classification)` : undefined}>
          <select id="t-c" className="input" value={cat} onChange={e => setCat(e.target.value as Category | 'auto')}><option value="auto">Auto-detect (estimate)</option>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>}
        <button className="btn primary">{txn ? 'Save changes' : 'Add transaction'}</button>
      </form>
    </Modal>
  )
}

export default function Transactions() {
  const { fin, dispatch, money } = useStore()
  const [q, setQ] = useState(''), [cat, setCat] = useState<string>('All'), [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [edit, setEdit] = useState<Txn | 'new' | null>(null)
  const list = useMemo(() => fin.txns.filter(t => (cat === 'All' || t.category === cat) && (type === 'all' || t.type === type) && t.desc.toLowerCase().includes(q.trim().toLowerCase())), [fin.txns, q, cat, type])
  const cats = useMemo(() => ['All', ...Array.from(new Set(fin.txns.map(t => t.category))).sort()], [fin.txns])
  const [limit, setLimit] = useState(40)
  const inSum = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), outSum = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head"><div><h1>Transactions</h1><p className="muted">Categories are keyword-based estimates, not verified bank classifications.</p></div>
        <button className="btn primary" onClick={() => setEdit('new')}><Plus size={16} />Add transaction</button></div>
      <div className="card stack" style={{ gap: 14 }}>
        <div className="row wrap">
          <div style={{ position: 'relative', flex: '1 1 220px' }}><Search size={16} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--muted)' }} /><input className="input" style={{ paddingLeft: 38 }} placeholder="Search transactions" aria-label="Search transactions" value={q} onChange={e => { setQ(e.target.value); setLimit(40) }} /></div>
          <select className="input" style={{ width: 'auto' }} aria-label="Filter by category" value={cat} onChange={e => { setCat(e.target.value); setLimit(40) }}>{cats.map(c => <option key={c}>{c}</option>)}</select>
          <div className="seg" role="group" aria-label="Type filter">{(['all', 'income', 'expense'] as const).map(t => <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
        </div>
        <div className="muted num" aria-live="polite">{list.length} shown · in <b className="mint">{money(inSum)}</b> · out <b style={{ color: 'var(--text)' }}>{money(outSum)}</b></div>
        {fin.txns.length === 0 ? <Empty title="No transactions yet"><div style={{ marginTop: 10 }}><button className="btn sm" onClick={() => setEdit('new')}>Add your first</button> <button className="btn sm ghost" onClick={() => dispatch({ t: 'loadSample', persona: fin.persona })}>Load sample history</button></div></Empty>
          : list.length === 0 ? <Empty title="No matches">Try a different search or filter.</Empty> :
          <table className="tbl stackable"><thead><tr><th>Description</th><th>Category</th><th>Date</th><th className="right">Amount</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>{list.slice(0, limit).map(t => <tr key={t.id}>
              <td><div className="row"><span className={`avatar ${t.type === 'expense' ? 'out' : ''}`} aria-hidden="true">{t.type === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><b>{t.desc}</b></div></td>
              <td><span className={`chip ${t.estimated ? 'est' : ''}`} title={t.estimated ? 'Estimated category' : 'Set by you'}>{t.category}{t.estimated ? ' · est.' : ''}</span></td>
              <td className="muted num">{parse(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
              <td className={`right num ${t.type === 'income' ? 'mint' : ''}`}><b>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</b></td>
              <td className="right" style={{ whiteSpace: 'nowrap' }}><button className="icon-btn" style={{ display: 'inline-grid' }} aria-label={`Edit ${t.desc}`} onClick={() => setEdit(t)}><Pencil size={15} /></button> <button className="icon-btn" style={{ display: 'inline-grid' }} aria-label={`Delete ${t.desc}`} onClick={() => dispatch({ t: 'deleteTxn', id: t.id })}><Trash2 size={15} /></button></td></tr>)}</tbody></table>}
        {list.length > limit && <button className="btn sm" onClick={() => setLimit(l => l + 40)}>Show more ({list.length - limit} remaining)</button>}
      </div>
      {edit && <TxnModal txn={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSave={t => { dispatch({ t: edit === 'new' ? 'addTxn' : 'updateTxn', txn: t }); setEdit(null) }} />}
    </div>
  )
}
