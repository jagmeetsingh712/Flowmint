import { FormEvent, ReactNode, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Field, Logo } from '../components/ui'
import { signIn, signUp, useStore } from '../store'
import { PERSONAS } from '../data/seed'
import { Persona } from '../engine/finance'
import { Sparkles } from 'lucide-react'

function Frame({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="authwrap">
      <div className="atmos" />
      <div className="authcard glass">
        <Link to="/" className="logo" style={{ paddingLeft: 0 }} aria-label="FlowMint home"><Logo /></Link>
        <h1 style={{ fontSize: 28 }}>{title}</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>{sub}</p>
        {children}
        <p className="hint" style={{ marginTop: 18 }}>Local prototype: accounts live only in this browser (password hashed with PBKDF2) and are <b>not</b> production authentication. FlowMint will never ask for banking passwords, UPI PINs or OTPs.</p>
      </div>
    </div>
  )
}

export function DemoAccess() {
  const { dispatch } = useStore(); const nav = useNavigate()
  const [p, setP] = useState<Persona>('salaried')
  const go = () => { dispatch({ t: 'login', session: { name: 'Demo user', email: '', demo: true } }); dispatch({ t: 'loadSample', persona: p }); nav('/dashboard') }
  return (
    <div className="stack" style={{ gap: 10, marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
      <div className="label">Or explore instantly with synthetic data</div>
      <select className="input" aria-label="Demo persona" value={p} onChange={e => setP(e.target.value as Persona)}>
        {(Object.keys(PERSONAS) as Persona[]).map(k => <option key={k} value={k}>{PERSONAS[k].label} — {PERSONAS[k].blurb}</option>)}
      </select>
      <button type="button" className="btn" onClick={go}><Sparkles size={16} />Enter demo mode</button>
    </div>
  )
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export function Login() {
  const { dispatch } = useStore(); const nav = useNavigate()
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (!emailOk(email)) er.email = 'Enter a valid email address.'
    if (!pw) er.pw = 'Enter your password.'
    setErr(er); if (Object.keys(er).length) return
    setBusy(true)
    const u = await signIn(email, pw); setBusy(false)
    if (!u) return setErr({ form: 'Email or password is incorrect (accounts are stored only in this browser).' })
    dispatch({ t: 'login', session: { ...u, demo: false } }); nav('/dashboard')
  }
  return (
    <Frame title="Welcome back" sub="Sign in to your FlowMint prototype account.">
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Email" id="em" error={err.email}><input id="em" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Password" id="pw" error={err.pw}><input id="pw" className="input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
        {err.form && <div className="err" role="alert">{err.form}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>New here? <Link to="/signup" className="mint">Create an account</Link></p>
      <DemoAccess />
    </Frame>
  )
}

export function Signup() {
  const { dispatch } = useStore(); const nav = useNavigate()
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (name.trim().length < 2) er.name = 'Enter your name.'
    if (!emailOk(email)) er.email = 'Enter a valid email address.'
    if (pw.length < 8) er.pw = 'Use at least 8 characters.'
    setErr(er); if (Object.keys(er).length) return
    setBusy(true)
    const f = await signUp(name, email, pw); setBusy(false)
    if (f) return setErr({ form: f })
    dispatch({ t: 'login', session: { name: name.trim(), email: email.trim().toLowerCase(), demo: false } }); nav('/onboarding')
  }
  return (
    <Frame title="Create your account" sub="Takes under two minutes. You'll set up your finances next.">
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Full name" id="nm" error={err.name}><input id="nm" className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Email" id="em2" error={err.email}><input id="em2" className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
        <Field label="Password" id="pw2" error={err.pw} hint="At least 8 characters."><input id="pw2" className="input" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
        {err.form && <div className="err" role="alert">{err.form}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>Already have an account? <Link to="/login" className="mint">Sign in</Link></p>
      <DemoAccess />
    </Frame>
  )
}
