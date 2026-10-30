import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import Crystal from '../components/Crystal'
import { BrakePill } from '../components/ui'
import { webglOk } from './util'

const HeroScene = lazy(() => import('./HeroScene'))

/** WebGL gem when available; the SVG/CSS-3D crystal is the static fallback (no WebGL, or load failure). */
export default function HeroVisual() {
  const [mode, setMode] = useState<'pending' | 'gl' | 'svg'>('pending')
  useEffect(() => { setMode(webglOk() ? 'gl' : 'svg') }, [])
  const fail = useCallback(() => setMode('svg'), [])
  if (mode === 'svg') return <Crystal />
  return (
    <div className="stage gl-stage" style={{ position: 'relative', perspective: 'none' }}>
      {mode === 'gl' && <Suspense fallback={null}><HeroScene onFail={fail} /></Suspense>}
      <div className="preview glass fl-card" style={{ right: -16, top: -8, transform: 'none' }}>
        <div className="eyebrow" style={{ fontSize: 10 }}>Safe-to-Save · illustrative</div>
        <div className="num" style={{ fontSize: 28, fontWeight: 800, margin: '2px 0 6px' }}>₹14,200</div>
        <BrakePill state="NORMAL" />
      </div>
      <div className="preview glass fl-card" style={{ left: -16, bottom: 0, width: 190, transform: 'none', animationDelay: '-3s' }}>
        <div className="eyebrow" style={{ fontSize: 10 }}>Rent due in 5 days</div>
        <div className="num" style={{ fontWeight: 800 }}>₹18,000 <span className="mint" style={{ fontSize: 12 }}>reserved</span></div>
      </div>
    </div>
  )
}
