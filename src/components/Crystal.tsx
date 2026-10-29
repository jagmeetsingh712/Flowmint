import { useEffect, useRef, useState } from 'react'
import { BrakePill } from './ui'

/** Original layered mint-glass gem: SVG facets + CSS 3D transforms. No WebGL, so the static fallback is the same artwork. */
export default function Crystal() {
  const rig = useRef<HTMLDivElement>(null)
  const [reduced, setReduced] = useState(false)
  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  const onMove = (e: React.PointerEvent) => {
    if (reduced || !rig.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    rig.current.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`
  }
  const onLeave = () => { if (rig.current) rig.current.style.transform = '' }
  return (
    <div className="stage" onPointerMove={onMove} onPointerLeave={onLeave} aria-hidden="true">
      <div className="rig" ref={rig}>
        <div className="layer" style={{ transform: 'translateZ(-120px)' }}>
          <div style={{ width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle,rgba(115,245,188,.35),rgba(55,214,192,.08) 55%,transparent 70%)', filter: 'blur(6px)' }} />
        </div>
        <div className="layer" style={{ transform: 'translateZ(-30px) rotateX(72deg)' }}>
          <svg className="spin-ring" width="340" height="340" viewBox="0 0 340 340"><circle cx="170" cy="170" r="150" fill="none" stroke="url(#ring)" strokeWidth="1.5" strokeDasharray="2 10" /><circle cx="170" cy="170" r="118" fill="none" stroke="rgba(115,245,188,.35)" strokeWidth="1" />
            <defs><linearGradient id="ring"><stop stopColor="#73F5BC" /><stop offset="1" stopColor="#9fb4ff" /></linearGradient></defs></svg>
        </div>
        <div className="layer float">
          <svg width="300" height="340" viewBox="0 0 300 340" style={{ filter: 'drop-shadow(0 30px 50px rgba(55,214,192,.35))' }}>
            <defs>
              <linearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e9fff6" stopOpacity=".95" /><stop offset="1" stopColor="#73F5BC" stopOpacity=".75" /></linearGradient>
              <linearGradient id="f2" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#73F5BC" stopOpacity=".9" /><stop offset="1" stopColor="#0d7f68" stopOpacity=".9" /></linearGradient>
              <linearGradient id="f3" x1="1" y1="0" x2="0" y2="1"><stop stopColor="#37D6C0" stopOpacity=".9" /><stop offset="1" stopColor="#0b4f48" stopOpacity=".95" /></linearGradient>
              <linearGradient id="f4" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bfffe3" stopOpacity=".9" /><stop offset="1" stopColor="#1aa88f" stopOpacity=".85" /></linearGradient>
            </defs>
            <g stroke="rgba(255,255,255,.55)" strokeWidth="1.2" strokeLinejoin="round">
              <polygon points="105,55 195,55 170,115 130,115" fill="url(#f1)" />
              <polygon points="105,55 40,115 130,115" fill="url(#f4)" />
              <polygon points="195,55 260,115 170,115" fill="url(#f2)" />
              <polygon points="40,115 130,115 150,290" fill="url(#f2)" />
              <polygon points="130,115 170,115 150,290" fill="url(#f4)" />
              <polygon points="170,115 260,115 150,290" fill="url(#f3)" />
            </g>
            <polygon className="sweep" points="105,55 150,55 120,115 80,115" fill="#fff" opacity=".4" />
            <path d="M62 112 L105 62" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="orb float" style={{ width: 46, height: 46, left: 10, top: 80, transform: 'translateZ(110px)', animationDelay: '-2s' }} />
        <div className="orb float" style={{ width: 26, height: 26, right: 24, top: 250, transform: 'translateZ(140px)', animationDelay: '-4s' }} />
        <div className="orb float" style={{ width: 16, height: 16, left: 60, bottom: 40, transform: 'translateZ(60px)', animationDelay: '-1s' }} />
        <div className="preview glass" style={{ right: -95, top: -10 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Safe-to-Save · illustrative</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 800, margin: '2px 0 6px' }}>₹14,200</div>
          <BrakePill state="NORMAL" />
        </div>
        <div className="preview glass" style={{ left: -95, bottom: 0, width: 190 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Rent due in 5 days</div>
          <div className="num" style={{ fontWeight: 800 }}>₹18,000 <span className="mint" style={{ fontSize: 12 }}>reserved</span></div>
        </div>
      </div>
    </div>
  )
}
