import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ReactNode, Suspense, lazy, useEffect } from 'react'
import { useStore } from './store'
import Shell from './components/Shell'
import Landing from './pages/Landing'
import { Login, Signup } from './pages/Auth'
import Onboarding from './pages/Onboarding'
const Dashboard = lazy(() => import('./pages/Dashboard'))
import Transactions from './pages/Transactions'
import Goals from './pages/Goals'
const Insights = lazy(() => import('./pages/Insights'))
import CalculatorPage from './pages/Calculator'
import SettingsPage from './pages/Settings'

function Guard({ children }: { children: ReactNode }) {
  const { state } = useStore()
  if (!state.session) return <Navigate to="/login" replace />
  if (!state.onboarded && !state.session.demo) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <Suspense fallback={<div className="authwrap muted">Loading…</div>}><Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Guard><Shell /></Guard>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  )
}
