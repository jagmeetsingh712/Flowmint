import { computeSafeToSave, SafeToSaveInput, SafeToSaveResult } from './safeToSave'

export type Category =
  | 'Income' | 'Rent' | 'Groceries' | 'Transport' | 'Utilities' | 'Dining' | 'Shopping'
  | 'Entertainment' | 'Subscriptions' | 'EMI' | 'Health' | 'Education' | 'Travel' | 'Other'

export const EXPENSE_CATEGORIES: Category[] = [
  'Rent', 'Groceries', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Entertainment',
  'Subscriptions', 'EMI', 'Health', 'Education', 'Travel', 'Other',
]
export type Persona = 'salaried' | 'gig' | 'student' | 'selfEmployed'

export interface Txn { id: string; date: string; desc: string; amount: number; type: 'income' | 'expense'; category: Category; estimated: boolean }
export interface Payment { id: string; name: string; amount: number; category: Category; kind: 'recurring' | 'oneoff'; dayOfMonth?: number; dueDate?: string; paidFor?: string }
export interface Goal { id: string; name: string; target: number; current: number; deadline: string }
export interface IncomePlan { amount: number; freq: 'monthly' | 'weekly' | 'irregular'; dayOfMonth: number }
export interface PlanSettings { safetyMargin: number; horizonDays: number; capPct: number | null; capAbsolute: number | null }
export interface Finance {
  persona: Persona
  openingBalance: number
  income: IncomePlan
  /** Variable essentials per month (groceries, transport, basic health). Fixed bills live in `payments` so nothing is double-counted. */
  essentialMonthly: number
  payments: Payment[]
  goals: Goal[]
  txns: Txn[]
  settings: PlanSettings
}

/** Policy: irregular income is counted at 70% (conservative). */
export const IRREGULAR_INCOME_FACTOR = 0.7

// ---------- dates ----------
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)
const clampDay = (y: number, m: number, day: number) => Math.min(day, new Date(y, m + 1, 0).getDate())

// ---------- categorisation (transparent keyword rules) ----------
const RULES: [Category, string[]][] = [
  ['Income', ['salary', 'payout', 'allowance', 'freelance', 'client payment', 'invoice', 'stipend']],
  ['Rent', ['rent', 'hostel', 'landlord']],
  ['EMI', ['emi', 'loan', 'instalment', 'installment']],
  ['Groceries', ['bigbasket', 'blinkit', 'zepto', 'dmart', 'kirana', 'grocery', 'instamart', 'vegetable']],
  ['Dining', ['zomato', 'swiggy', 'cafe', 'restaurant', 'starbucks', 'domino', 'pizza', 'biryani']],
  ['Travel', ['irctc', 'makemytrip', 'indigo', 'goibibo', 'hotel', 'flight']],
  ['Transport', ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'fastag', 'auto']],
  ['Shopping', ['amazon', 'flipkart', 'myntra', 'ajio', 'mall']],
  ['Entertainment', ['bookmyshow', 'cinema', 'pvr', 'steam', 'concert']],
  ['Subscriptions', ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'icloud', 'notion', 'software']],
  ['Utilities', ['electricity', 'bescom', 'water', 'broadband', 'airtel', 'jio', 'internet', 'gas', 'recharge']],
  ['Health', ['pharmacy', 'apollo', 'clinic', 'gym', 'hospital', 'medic']],
  ['Education', ['course', 'udemy', 'coursera', 'tuition', 'exam', 'college', 'books']],
]
export function categorize(desc: string): Category {
  const d = desc.toLowerCase()
  for (const [cat, words] of RULES) if (words.some(w => d.includes(w))) return cat
  return 'Other'
}

// ---------- occurrences within a horizon ----------
export interface Occurrence { payment: Payment; date: Date }
export function paymentOccurrences(payments: Payment[], today: Date, horizonDays: number): Occurrence[] {
  const t0 = startOfDay(today), end = addDays(t0, horizonDays), out: Occurrence[] = []
  for (const p of payments) {
    if (p.kind === 'oneoff' && p.dueDate) {
      const d = parse(p.dueDate)
      if (d >= t0 && d <= end) out.push({ payment: p, date: d })
    } else if (p.kind === 'recurring' && p.dayOfMonth) {
      for (let k = 0; k <= Math.ceil(horizonDays / 28) + 1; k++) {
        const y = t0.getFullYear(), m = t0.getMonth() + k
        const d = new Date(y, m, clampDay(y, m, p.dayOfMonth))
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (d >= t0 && d <= end && p.paidFor !== key) out.push({ payment: p, date: d })
      }
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export interface IncomeEvent { date: Date; amount: number }
export function incomeEvents(inc: IncomePlan, today: Date, horizonDays: number): IncomeEvent[] {
  const t0 = startOfDay(today), end = addDays(t0, horizonDays), out: IncomeEvent[] = []
  if (inc.freq === 'monthly') {
    for (let k = 0; k <= Math.ceil(horizonDays / 28) + 1; k++) {
      const y = t0.getFullYear(), m = t0.getMonth() + k
      const d = new Date(y, m, clampDay(y, m, inc.dayOfMonth))
      if (d >= t0 && d <= end) out.push({ date: d, amount: inc.amount })
    }
  } else if (inc.freq === 'weekly') {
    for (let i = 7; i <= horizonDays; i += 7) out.push({ date: addDays(t0, i), amount: inc.amount })
  } else {
    // Irregular: spread a discounted expectation evenly; never presented as certain.
    const total = inc.amount * (horizonDays / 30) * IRREGULAR_INCOME_FACTOR
    const n = Math.max(1, Math.round(horizonDays / 7))
    for (let i = 1; i <= n; i++) out.push({ date: addDays(t0, Math.min(horizonDays, i * 7 - 3)), amount: total / n })
  }
  return out
}

// ---------- derived snapshot (single source for every screen) ----------
export interface Derived {
  today: Date
  balance: number
  expectedIncome: number
  essentials: number
  recurringTotal: number
  obligationsTotal: number
  savingsTotal: number
  input: SafeToSaveInput
  result: SafeToSaveResult
  upcoming: Occurrence[]
  incomeEvts: IncomeEvent[]
  suggestions: Record<string, number>
}

export const balanceOf = (f: Finance) =>
  Math.round((f.openingBalance + f.txns.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)) * 100) / 100

export function derive(f: Finance, today: Date = new Date()): Derived {
  const h = f.settings.horizonDays
  const upcoming = paymentOccurrences(f.payments, today, h)
  const recurringTotal = sum(upcoming.filter(o => o.payment.kind === 'recurring').map(o => o.payment.amount))
  const obligationsTotal = sum(upcoming.filter(o => o.payment.kind === 'oneoff').map(o => o.payment.amount))
  const incomeEvts = incomeEvents(f.income, today, h)
  const expectedIncome = sum(incomeEvts.map(e => e.amount))
  const essentials = f.essentialMonthly * (h / 30)
  const balance = balanceOf(f)
  const input: SafeToSaveInput = {
    balance: Math.max(0, balance), expectedIncome, essentialExpenses: essentials, recurringCommitments: recurringTotal,
    upcomingObligations: obligationsTotal, safetyMargin: f.settings.safetyMargin, horizonDays: h,
    capPctOfBalance: f.settings.capPct, capAbsolute: f.settings.capAbsolute,
  }
  const result = computeSafeToSave(input)
  const savingsTotal = sum(f.goals.map(g => g.current))
  return { today, balance, expectedIncome, essentials, recurringTotal, obligationsTotal, savingsTotal, input, result, upcoming, incomeEvts, suggestions: suggestContributions(f.goals, result, today) }
}

/** Splits the (already brake-limited) recommendation across open goals. Sum never exceeds the recommendation. */
export function suggestContributions(goals: Goal[], r: SafeToSaveResult, today: Date): Record<string, number> {
  const out: Record<string, number> = {}
  goals.forEach(g => (out[g.id] = 0))
  if (r.state === 'PAUSE' || r.recommended <= 0) return out
  const open = goals.filter(g => g.current < g.target)
  const need = open.map(g => {
    const months = Math.max(1, daysBetween(today, parse(g.deadline)) / 30)
    return { g, monthly: (g.target - g.current) / months }
  })
  const total = sum(need.map(n => n.monthly))
  if (total <= 0) return out
  let budget = r.recommended
  for (const n of need) {
    const share = Math.floor(Math.min(n.g.target - n.g.current, budget, (r.recommended * n.monthly) / total) / 10) * 10
    out[n.g.id] = Math.max(0, share); budget -= out[n.g.id]
  }
  return out
}

// ---------- projections & analytics ----------
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0)
const stdev = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }

export interface DayPoint { date: string; label: string; balance: number; income: number; payments: number }
/** Daily projected balance across the planning horizon (income and payments placed on their dates, essentials spread evenly). */
export function projection(f: Finance, d: Derived): DayPoint[] {
  const h = f.settings.horizonDays, perDay = d.essentials / h
  let bal = d.balance
  const pts: DayPoint[] = []
  for (let i = 0; i <= h; i++) {
    const day = addDays(d.today, i), key = iso(day)
    const inc = sum(d.incomeEvts.filter(e => iso(e.date) === key).map(e => e.amount))
    const pay = sum(d.upcoming.filter(o => iso(o.date) === key).map(o => o.payment.amount))
    if (i > 0) bal += inc - pay - perDay
    pts.push({ date: key, label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), balance: Math.round(bal), income: Math.round(inc), payments: Math.round(pay) })
  }
  return pts
}

export const expenseTxns = (t: Txn[]) => t.filter(x => x.type === 'expense')

export function categoryBreakdown(txns: Txn[], today: Date, days = 30) {
  const from = addDays(today, -days), map = new Map<Category, number>()
  for (const t of expenseTxns(txns)) if (parse(t.date) > from) map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
  const total = sum([...map.values()])
  return [...map.entries()].map(([category, value]) => ({ category, value: Math.round(value), pct: total ? value / total : 0 })).sort((a, b) => b.value - a.value)
}

export function monthlyTrend(txns: Txn[], today: Date, months = 4) {
  const out: { key: string; label: string; income: number; expenses: number; partial: boolean }[] = []
  for (let k = months - 1; k >= 0; k--) {
    const m = new Date(today.getFullYear(), today.getMonth() - k, 1)
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
    const inMonth = txns.filter(t => t.date.startsWith(key))
    out.push({
      key, label: m.toLocaleDateString('en-IN', { month: 'short' }),
      income: Math.round(sum(inMonth.filter(t => t.type === 'income').map(t => t.amount))),
      expenses: Math.round(sum(inMonth.filter(t => t.type === 'expense').map(t => t.amount))),
      partial: k === 0,
    })
  }
  return out
}

/** Weekly expense totals, oldest → newest, ending today. */
export function weeklyExpenses(txns: Txn[], today: Date, weeks = 16): number[] {
  const out: number[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const to = addDays(today, -7 * w), from = addDays(to, -7)
    out.push(sum(expenseTxns(txns).filter(t => { const d = parse(t.date); return d > from && d <= to }).map(t => t.amount)))
  }
  return out
}

export interface ForecastResult {
  ok: boolean
  reason?: string
  method?: string
  forecast?: number[]
  mae?: Record<string, number>
  history: number[]
}
/**
 * Transparent baseline: compares naive, 4-week moving average and simple exponential smoothing
 * with rolling-origin one-step-ahead evaluation, then uses the lowest-error method.
 * This is a statistical baseline on synthetic/demo data, not a trained ML model.
 */
export function forecastWeeklyExpenses(txns: Txn[], today: Date): ForecastResult {
  const y = weeklyExpenses(txns, today, 16)
  const firstNonZero = y.findIndex(v => v > 0)
  const h = firstNonZero < 0 ? [] : y.slice(firstNonZero)
  if (h.length < 10) return { ok: false, reason: 'At least 10 weeks of transactions are needed for a baseline forecast.', history: h }
  const methods: Record<string, (s: number[]) => number> = {
    'Naive (last week)': s => s[s.length - 1],
    '4-week moving average': s => mean(s.slice(-4)),
    'Exponential smoothing (α=0.3)': s => s.reduce((l, v, i) => (i === 0 ? v : 0.3 * v + 0.7 * l), s[0]),
  }
  const mae: Record<string, number> = {}
  const testN = 5
  for (const [name, fn] of Object.entries(methods)) {
    const errs: number[] = []
    for (let t = h.length - testN; t < h.length; t++) errs.push(Math.abs(fn(h.slice(0, t)) - h[t]))
    mae[name] = Math.round(mean(errs))
  }
  const best = Object.entries(mae).sort((a, b) => a[1] - b[1])[0][0]
  const flat = Math.round(methods[best](h))
  return { ok: true, method: best, forecast: [flat, flat, flat, flat], mae, history: h }
}

/** Rule-based recurring detection: ≥3 similar-amount payments to the same payee ~monthly. */
export function detectRecurring(txns: Txn[]) {
  const groups = new Map<string, Txn[]>()
  for (const t of expenseTxns(txns)) {
    const k = t.desc.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  const out: { name: string; amount: number; count: number; category: Category }[] = []
  for (const [, g] of groups) {
    if (g.length < 3) continue
    const sorted = [...g].sort((a, b) => a.date.localeCompare(b.date))
    const amts = sorted.map(t => t.amount), med = [...amts].sort((a, b) => a - b)[Math.floor(amts.length / 2)]
    if (!amts.every(a => Math.abs(a - med) / med <= 0.1)) continue
    const gaps = sorted.slice(1).map((t, i) => daysBetween(parse(sorted[i].date), parse(t.date)))
    if (gaps.every(x => x >= 25 && x <= 35)) out.push({ name: sorted[0].desc, amount: med, count: g.length, category: sorted[0].category })
  }
  return out.sort((a, b) => b.amount - a.amount)
}

export function incomeVariability(txns: Txn[], today: Date) {
  const months = monthlyTrend(txns, today, 4).filter(m => !m.partial && m.income > 0).map(m => m.income)
  if (months.length < 2) return null
  const cv = stdev(months) / mean(months)
  return { cv, avg: Math.round(mean(months)), min: Math.min(...months), max: Math.max(...months) }
}

export interface Insight { tone: 'good' | 'warn' | 'bad' | 'info'; title: string; body: string }
export function buildInsights(f: Finance, d: Derived): Insight[] {
  const out: Insight[] = []
  const cats = categoryBreakdown(f.txns, d.today, 30)
  if (cats.length) out.push({ tone: 'info', title: `${cats[0].category} is your largest spend`, body: `${Math.round(cats[0].pct * 100)}% of the last 30 days of spending (₹${cats[0].value.toLocaleString('en-IN')}).` })
  const prev = sum(expenseTxns(f.txns).filter(t => { const x = parse(t.date); return x > addDays(d.today, -60) && x <= addDays(d.today, -30) }).map(t => t.amount))
  const cur = sum(cats.map(c => c.value))
  if (prev > 0 && cur > 0) {
    const ch = (cur - prev) / prev
    out.push({ tone: ch > 0.15 ? 'warn' : 'good', title: ch >= 0 ? `Spending is up ${Math.round(ch * 100)}%` : `Spending is down ${Math.round(-ch * 100)}%`, body: `₹${cur.toLocaleString('en-IN')} in the last 30 days versus ₹${Math.round(prev).toLocaleString('en-IN')} in the 30 days before.` })
  }
  const next14 = sum(paymentOccurrences(f.payments, d.today, 14).map(o => o.payment.amount))
  if (d.balance > 0 && next14 > 0) {
    const p = next14 / d.balance
    out.push({ tone: p > 0.7 ? 'bad' : p > 0.4 ? 'warn' : 'good', title: p > 0.4 ? 'Cash-flow pressure ahead' : 'Upcoming payments look comfortable', body: `₹${Math.round(next14).toLocaleString('en-IN')} is due in the next 14 days — ${Math.round(p * 100)}% of your current balance.` })
  } else if (d.balance <= 0) out.push({ tone: 'bad', title: 'Balance is at or below zero', body: 'Saving is paused until the balance is positive and covers upcoming payments.' })
  const v = incomeVariability(f.txns, d.today)
  if (f.income.freq === 'irregular' || (v && v.cv > 0.25)) {
    out.push({ tone: 'warn', title: 'Irregular income detected', body: `Income is counted at ${Math.round(IRREGULAR_INCOME_FACTOR * 100)}% when it is not fixed${v ? `; recent monthly income ranged ₹${v.min.toLocaleString('en-IN')}–₹${v.max.toLocaleString('en-IN')}` : ''}. Treat recommendations conservatively.` })
  }
  if (d.result.state === 'PAUSE') out.push({ tone: 'bad', title: 'Financial Safety Brake: Pause', body: d.result.reasons.join(' ') })
  return out
}
