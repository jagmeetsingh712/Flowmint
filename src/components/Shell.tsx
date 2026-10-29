import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, LineChart, Calculator, Settings, LogOut, Info } from 'lucide-react'
import { Logo } from './ui'
import { useStore } from '../store'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/goals', label: 'Goals', Icon: Target },
  { to: '/insights', label: 'Insights', Icon: LineChart },
  { to: '/calculator', label: 'Calculator', Icon: Calculator },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export default function Shell() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()
  const out = () => { dispatch({ t: 'logout' }); nav('/') }
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="atmos" />
      <div className="shell">
        <aside className="side">
          <div className="logo"><Logo /></div>
          <nav className="nav" aria-label="Primary">
            {NAV.map(n => <NavLink key={n.to} to={n.to}><n.Icon size={19} />{n.label}</NavLink>)}
          </nav>
          <div style={{ flex: 1 }} />
          <div className="hint" style={{ padding: '0 10px 8px' }}>{state.session?.demo ? 'Demo mode · synthetic data' : state.session?.email}</div>
          <button className="btn ghost" onClick={out} style={{ justifyContent: 'flex-start' }}><LogOut size={18} />Sign out</button>
        </aside>
        <main id="main" className="main">
          <div className="banner" role="note"><Info size={16} />Academic prototype using synthetic demo data. FlowMint never connects to bank accounts or asks for banking credentials.</div>
          <Outlet />
        </main>
      </div>
      <nav className="bottom" aria-label="Primary mobile">
        {NAV.map(n => <NavLink key={n.to} to={n.to}><n.Icon size={20} /><span>{n.label}</span></NavLink>)}
      </nav>
    </>
  )
}
