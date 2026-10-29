import { Finance, Payment, Persona, Txn, addDays, categorize, iso, startOfDay } from '../engine/finance'

/** Deterministic PRNG so the demo data is reproducible (fixed seed per persona). */
export function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

interface Cfg {
  label: string; blurb: string; seed: number; income: Finance['income']; essentialMonthly: number
  fixed: Omit<Payment, 'id'>[]; spend: number; payouts?: { perMonth: number; min: number; max: number; names: string[] }
  extraIncome?: { prob: number; min: number; max: number; name: string }
  margin: number; horizon: number; capPct: number | null; targetBalance: number
  goals: { name: string; target: number; current: number; months: number }[]
}
const R = (name: string, amount: number, day: number, category: Payment['category']): Omit<Payment, 'id'> => ({ name, amount, dayOfMonth: day, category, kind: 'recurring' })

export const PERSONAS: Record<Persona, Cfg> = {
  salaried: {
    label: 'Salaried employee', blurb: 'Fixed monthly salary, rent and a loan EMI.', seed: 11,
    income: { amount: 62000, freq: 'monthly', dayOfMonth: 28 }, essentialMonthly: 13500, spend: 1,
    fixed: [R('Rent — 2BHK flat', 18000, 5, 'Rent'), R('Car loan EMI', 7500, 10, 'EMI'), R('Broadband (ACT)', 799, 12, 'Utilities'),
      R('Electricity bill', 2400, 18, 'Utilities'), R('Netflix', 649, 15, 'Subscriptions'), R('Spotify', 119, 20, 'Subscriptions'), R('Gym membership', 1500, 3, 'Health')],
    margin: 8000, horizon: 14, capPct: null, targetBalance: 78000,
    goals: [{ name: 'Emergency fund', target: 120000, current: 45000, months: 12 }, { name: 'Education — cloud certification', target: 40000, current: 12000, months: 8 },
      { name: 'Travel — Goa trip', target: 30000, current: 8000, months: 5 }, { name: 'New laptop', target: 85000, current: 20000, months: 10 }],
  },
  gig: {
    label: 'Gig / irregular worker', blurb: 'Variable weekly payouts, tighter margins.', seed: 23,
    income: { amount: 32000, freq: 'irregular', dayOfMonth: 1 }, essentialMonthly: 9000, spend: 0.8,
    fixed: [R('Room rent', 9000, 3, 'Rent'), R('Phone EMI', 2200, 8, 'EMI'), R('Jio recharge', 399, 10, 'Utilities'), R('Electricity bill', 1200, 15, 'Utilities'), R('YouTube Premium', 129, 22, 'Subscriptions')],
    payouts: { perMonth: 14, min: 900, max: 3800, names: ['Swiggy payout', 'Zomato payout', 'Rapido payout', 'Uber payout'] },
    margin: 5000, horizon: 14, capPct: 0.2, targetBalance: 14000,
    goals: [{ name: 'Emergency fund', target: 40000, current: 6000, months: 12 }, { name: 'Education — skill course', target: 15000, current: 2500, months: 6 }, { name: 'Travel — home visit', target: 8000, current: 1500, months: 4 }, { name: 'New phone', target: 20000, current: 3000, months: 9 }],
  },
  student: {
    label: 'Student', blurb: 'Monthly allowance plus occasional freelance work.', seed: 37,
    income: { amount: 12000, freq: 'monthly', dayOfMonth: 1 }, essentialMonthly: 4500, spend: 0.5,
    fixed: [R('Hostel rent', 6000, 5, 'Rent'), R('Airtel recharge', 599, 9, 'Utilities'), R('Spotify student', 59, 14, 'Subscriptions')],
    extraIncome: { prob: 0.05, min: 1500, max: 4000, name: 'Freelance payout' },
    margin: 1500, horizon: 30, capPct: 0.25, targetBalance: 9000,
    goals: [{ name: 'Emergency fund', target: 15000, current: 3000, months: 12 }, { name: 'Education — exam fee', target: 6000, current: 1500, months: 5 }, { name: 'Travel — college trip', target: 7000, current: 1000, months: 6 }, { name: 'Laptop upgrade', target: 45000, current: 5000, months: 14 }],
  },
  selfEmployed: {
    label: 'Small self-employed earner', blurb: 'Client invoices, shop rent and compliance costs.', seed: 53,
    income: { amount: 70000, freq: 'irregular', dayOfMonth: 1 }, essentialMonthly: 18000, spend: 1.2,
    fixed: [R('Shop rent', 14000, 1, 'Rent'), R('Business loan EMI', 12000, 7, 'EMI'), R('Electricity bill', 3500, 20, 'Utilities'), R('Accounting software', 1299, 11, 'Subscriptions'), R('GST / compliance fees', 5000, 20, 'Other')],
    payouts: { perMonth: 4, min: 8000, max: 28000, names: ['Client payment — invoice', 'Client payment — retainer', 'Client payment — project'] },
    margin: 15000, horizon: 21, capPct: 0.3, targetBalance: 95000,
    goals: [{ name: 'Emergency fund', target: 250000, current: 70000, months: 18 }, { name: 'Education — business course', target: 50000, current: 10000, months: 9 }, { name: 'Travel — family trip', target: 60000, current: 15000, months: 8 }, { name: 'Equipment upgrade', target: 120000, current: 30000, months: 12 }],
  },
}

const POOL = {
  groceries: ['BigBasket order', 'Blinkit order', 'DMart purchase', 'Local kirana store', 'Zepto order'],
  dining: ['Zomato order', 'Swiggy order', 'Cafe Coffee Day', 'Domino\'s Pizza', 'Biryani House'],
  transport: ['Uber ride', 'Ola ride', 'Rapido bike', 'Delhi Metro recharge', 'Petrol pump fuel'],
  shopping: ['Amazon purchase', 'Flipkart order', 'Myntra order'],
  entertainment: ['BookMyShow tickets', 'PVR cinemas'],
  health: ['Apollo Pharmacy', 'Clinic consultation'],
}

export function buildFinance(persona: Persona, today: Date = new Date(), history = 120): Finance {
  const c = PERSONAS[persona], rnd = mulberry32(c.seed)
  const rng = (a: number, b: number) => Math.round(a + rnd() * (b - a))
  const pick = (a: string[]) => a[Math.floor(rnd() * a.length)]
  const t0 = startOfDay(today)
  const payments: Payment[] = c.fixed.map((p, i) => ({ ...p, id: `p${i}` }))
  const txns: Txn[] = []
  let n = 0
  const add = (d: Date, desc: string, amount: number, type: Txn['type']) =>
    txns.push({ id: `t${n++}`, date: iso(d), desc, amount, type, category: type === 'income' ? 'Income' : categorize(desc), estimated: true })

  for (let i = history - 1; i >= 0; i--) {
    const d = addDays(t0, -i), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    for (const p of c.fixed) if (Math.min(p.dayOfMonth!, last) === d.getDate()) add(d, p.name, p.amount, 'expense')
    if (c.income.freq === 'monthly' && Math.min(c.income.dayOfMonth, last) === d.getDate()) add(d, persona === 'student' ? 'Parental allowance' : 'Salary credit — employer', c.income.amount, 'income')
    if (c.payouts && rnd() < c.payouts.perMonth / 30) add(d, pick(c.payouts.names), rng(c.payouts.min, c.payouts.max), 'income')
    if (c.extraIncome && rnd() < c.extraIncome.prob) add(d, c.extraIncome.name, rng(c.extraIncome.min, c.extraIncome.max), 'income')
    const s = c.spend
    if (rnd() < 0.28) add(d, pick(POOL.groceries), rng(250, 1500 * s), 'expense')
    if (rnd() < 0.33) add(d, pick(POOL.transport), rng(60, 420 * s), 'expense')
    if (rnd() < 0.2) add(d, pick(POOL.dining), rng(150, 800 * s), 'expense')
    if (rnd() < 0.06) add(d, pick(POOL.shopping), rng(500, 3000 * s), 'expense')
    if (rnd() < 0.05) add(d, pick(POOL.entertainment), rng(200, 800), 'expense')
    if (rnd() < 0.03) add(d, pick(POOL.health), rng(150, 1100), 'expense')
  }
  txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const net = txns.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
  return {
    persona, openingBalance: c.targetBalance - net, income: c.income, essentialMonthly: c.essentialMonthly,
    payments: [...payments, ...extraOneOffs(persona, t0)], txns,
    goals: c.goals.map((g, i) => ({ id: `g${i}`, name: g.name, target: g.target, current: g.current, deadline: iso(addDays(t0, g.months * 30)) })),
    settings: { safetyMargin: c.margin, horizonDays: c.horizon, capPct: c.capPct, capAbsolute: null },
  }
}

function extraOneOffs(persona: Persona, t0: Date): Payment[] {
  const o = (id: string, name: string, amount: number, inDays: number, category: Payment['category']): Payment => ({ id, name, amount, category, kind: 'oneoff', dueDate: iso(addDays(t0, inDays)) })
  switch (persona) {
    case 'salaried': return [o('o1', 'Home insurance premium', 4200, 9, 'Other'), o('o2', 'Water & maintenance', 1800, 6, 'Utilities')]
    case 'gig': return [o('o1', 'Bike service', 1500, 8, 'Transport')]
    case 'student': return [o('o1', 'Semester exam fee', 2500, 12, 'Education')]
    case 'selfEmployed': return [o('o1', 'Advance tax instalment', 9000, 13, 'Other')]
  }
}

export function emptyFinance(persona: Persona = 'salaried'): Finance {
  const c = PERSONAS[persona]
  return { persona, openingBalance: 0, income: { amount: 0, freq: 'monthly', dayOfMonth: 1 }, essentialMonthly: 0, payments: [], goals: [], txns: [], settings: { safetyMargin: 0, horizonDays: 30, capPct: c.capPct, capAbsolute: null } }
}
