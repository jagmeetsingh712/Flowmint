import { useState } from 'react'
import { Modal, Field, NumInput } from './ui'
import { EXPENSE_CATEGORIES, Category, Payment, iso, addDays } from '../engine/finance'

export default function PaymentModal({ onSave, onClose }: { onSave: (p: Payment) => void; onClose: () => void }) {
  const [name, setName] = useState(''), [amount, setAmount] = useState(0), [category, setCategory] = useState<Category>('Utilities')
  const [kind, setKind] = useState<'recurring' | 'oneoff'>('recurring'), [day, setDay] = useState(1), [date, setDate] = useState(iso(addDays(new Date(), 7)))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!name.trim()) er.name = 'Give this payment a name.'
    if (!(amount > 0)) er.amount = 'Enter an amount greater than ₹0.'
    if (kind === 'recurring' && !(day >= 1 && day <= 31)) er.day = 'Pick a day between 1 and 31.'
    if (kind === 'oneoff' && !date) er.date = 'Choose a due date.'
    setErrs(er)
    if (Object.keys(er).length) return
    onSave({ id: 'p' + Date.now(), name: name.trim(), amount, category, kind, ...(kind === 'recurring' ? { dayOfMonth: day } : { dueDate: date }) })
  }
  return (
    <Modal title="Add upcoming payment" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Name" id="pm-name" error={errs.name}><input id="pm-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rent, Electricity, Car EMI" /></Field>
        <div className="grid g2">
          <Field label="Amount (₹)" id="pm-amt" error={errs.amount}><NumInput id="pm-amt" value={amount} onChange={setAmount} /></Field>
          <Field label="Category" id="pm-cat"><select id="pm-cat" className="input" value={category} onChange={e => setCategory(e.target.value as Category)}>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Repeats" id="pm-kind"><select id="pm-kind" className="input" value={kind} onChange={e => setKind(e.target.value as 'recurring' | 'oneoff')}><option value="recurring">Every month (recurring commitment)</option><option value="oneoff">One time (upcoming obligation)</option></select></Field>
        {kind === 'recurring'
          ? <Field label="Day of month" id="pm-day" error={errs.day}><NumInput id="pm-day" value={day} min={1} step={1} onChange={setDay} /></Field>
          : <Field label="Due date" id="pm-date" error={errs.date}><input id="pm-date" className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>}
        <button className="btn primary" type="submit">Add payment</button>
      </form>
    </Modal>
  )
}
