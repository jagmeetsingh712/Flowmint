import { createContext, useContext, useEffect, useMemo, useReducer, ReactNode, useCallback } from 'react'
import { Finance, Goal, Payment, Persona, Txn, derive, Derived, iso } from './engine/finance'
import { buildFinance, emptyFinance } from './data/seed'

export interface Session { name: string; email: string; demo: boolean }
export interface Prefs { hideBalances: boolean; reduceMotion: boolean }
interface State { session: Session | null; fin: Finance | null; prefs: Prefs; onboarded: boolean; demoData: boolean }

type Action =
  | { t: 'login'; session: Session }
  | { t: 'logout' }
  | { t: 'setFin'; fin: Finance; onboarded?: boolean }
  | { t: 'loadSample'; persona: Persona }
  | { t: 'prefs'; prefs: Partial<Prefs> }
  | { t: 'addTxn'; txn: Txn } | { t: 'updateTxn'; txn: Txn } | { t: 'deleteTxn'; id: string }
  | { t: 'upsertGoal'; goal: Goal } | { t: 'deleteGoal'; id: string } | { t: 'contribute'; id: string; amount: number }
  | { t: 'markPaid'; id: string; date: string }
  | { t: 'settings'; patch: Partial<Finance['settings']> }
  | { t: 'wipe' }

const KEY = 'flowmint.v1'
const initial: State = { session: null, fin: null, prefs: { hideBalances: false, reduceMotion: false }, onboarded: false, demoData: false }

function load(): State {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...initial, ...JSON.parse(raw) } } catch { /* storage unavailable */ }
  return initial
}

function reducer(s: State, a: Action): State {
  const f = s.fin
  switch (a.t) {
    case 'login': {
      if (a.session.demo) return { ...s, session: a.session, onboarded: true, fin: s.fin ?? buildFinance('salaried'), demoData: s.fin ? s.demoData : true }
      // Never show leftover demo data to a real (local) account.
      const reset = s.demoData || !s.fin
      return { ...s, session: a.session, fin: reset ? null : s.fin, onboarded: reset ? false : s.onboarded, demoData: false }
    }
    case 'logout': return { ...s, session: null }
    case 'setFin': return { ...s, fin: a.fin, onboarded: a.onboarded ?? s.onboarded, demoData: false }
    case 'loadSample': return { ...s, fin: buildFinance(a.persona), demoData: true, onboarded: true }
    case 'prefs': return { ...s, prefs: { ...s.prefs, ...a.prefs } }
    case 'wipe': return { ...initial, prefs: s.prefs }
    default: break
  }
  if (!f) return s
  switch (a.t) {
    case 'addTxn': return { ...s, fin: { ...f, txns: [a.txn, ...f.txns].sort((x, y) => y.date.localeCompare(x.date)) } }
    case 'updateTxn': return { ...s, fin: { ...f, txns: f.txns.map(t => (t.id === a.txn.id ? a.txn : t)).sort((x, y) => y.date.localeCompare(x.date)) } }
    case 'deleteTxn': return { ...s, fin: { ...f, txns: f.txns.filter(t => t.id !== a.id) } }
    case 'upsertGoal': return { ...s, fin: { ...f, goals: f.goals.some(g => g.id === a.goal.id) ? f.goals.map(g => (g.id === a.goal.id ? a.goal : g)) : [...f.goals, a.goal] } }
    case 'deleteGoal': return { ...s, fin: { ...f, goals: f.goals.filter(g => g.id !== a.id) } }
    case 'contribute': {
      const g = f.goals.find(x => x.id === a.id); if (!g) return s
      const amt = Math.min(a.amount, g.target - g.current)
      const txn: Txn = { id: 't' + Date.now(), date: iso(new Date()), desc: `Savings transfer — ${g.name}`, amount: amt, type: 'expense', category: 'Other', estimated: false }
      return { ...s, fin: { ...f, goals: f.goals.map(x => (x.id === a.id ? { ...x, current: x.current + amt } : x)), txns: [txn, ...f.txns] } }
    }
    case 'markPaid': {
      const p = f.payments.find(x => x.id === a.id); if (!p) return s
      const txn: Txn = { id: 't' + Date.now(), date: iso(new Date()), desc: p.name, amount: p.amount, type: 'expense', category: p.category, estimated: false }
      const payments: Payment[] = p.kind === 'oneoff' ? f.payments.filter(x => x.id !== p.id) : f.payments.map(x => (x.id === p.id ? { ...x, paidFor: a.date.slice(0, 7) } : x))
      return { ...s, fin: { ...f, payments, txns: [txn, ...f.txns] } }
    }
    case 'settings': return { ...s, fin: { ...f, settings: { ...f.settings, ...a.patch } } }
  }
  return s
}

interface Ctx {
  state: State; dispatch: (a: Action) => void
  fin: Finance; d: Derived
  money: (n: number) => string
}
const C = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }, [state])
  useEffect(() => { document.documentElement.dataset.reduceMotion = String(state.prefs.reduceMotion) }, [state.prefs.reduceMotion])
  const fin = state.fin ?? emptyFinance()
  const d = useMemo(() => derive(fin), [fin])
  const hide = state.prefs.hideBalances
  const money = useCallback((n: number) => (hide ? '₹ ••••' : '₹' + Math.round(n).toLocaleString('en-IN')), [hide])
  return <C.Provider value={{ state, dispatch, fin, d, money }}>{children}</C.Provider>
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('StoreProvider missing'); return c }

// ---------- local demo accounts (NOT production auth) ----------
const ACC = 'flowmint.accounts'
type Acc = { email: string; name: string; salt: string; hash: string }
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)))
async function hashPw(pw: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256))
}
const accounts = (): Acc[] => { try { return JSON.parse(localStorage.getItem(ACC) || '[]') } catch { return [] } }
export async function signUp(name: string, email: string, pw: string): Promise<string | null> {
  if (!crypto?.subtle) return 'Your browser does not support secure hashing here.'
  const list = accounts(); email = email.trim().toLowerCase()
  if (list.some(a => a.email === email)) return 'An account with this email already exists on this device.'
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)).buffer)
  list.push({ email, name: name.trim(), salt, hash: await hashPw(pw, salt) })
  try { localStorage.setItem(ACC, JSON.stringify(list)) } catch { return 'Could not save the account (storage unavailable).' }
  return null
}
export async function signIn(email: string, pw: string): Promise<{ name: string; email: string } | null> {
  const a = accounts().find(x => x.email === email.trim().toLowerCase())
  if (!a || !crypto?.subtle) return null
  return (await hashPw(pw, a.salt)) === a.hash ? { name: a.name, email: a.email } : null
}
