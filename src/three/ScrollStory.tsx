import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { computeSafeToSave, inr } from '../engine/safeToSave'
import { disposeScene, prefersReduced, visibleLoop, webglOk } from './util'

gsap.registerPlugin(ScrollTrigger)

// Illustrative scenario straight from the synopsis tests, computed by the real engine.
const IN = { balance: 30000, expectedIncome: 0, essentialExpenses: 2500, recurringCommitments: 600, upcomingObligations: 6000, safetyMargin: 1500 }
const UNCAPPED = computeSafeToSave(IN)
const CAPPED = computeSafeToSave({ ...IN, capPctOfBalance: 0.2 })
const COL = { ess: 0x7d8db0, com: 0x9a8cf0, obl: 0xff7c86, mar: 0xf6c66a, safe: 0x73f5bc }
const CSS = { ess: '#7d8db0', com: '#9a8cf0', obl: '#FF7C86', mar: '#F6C66A', safe: '#73F5BC' }

const STEPS = [
  { t: 'Start with what you actually hold', b: `Your balance plus income you can count on inside the planning horizon. In this example: ${inr(IN.balance)}.` },
  { t: 'Reserve everyday essentials', b: `Groceries, transport and fixed commitments come off first: ${inr(IN.essentialExpenses)} + ${inr(IN.recurringCommitments)}.` },
  { t: 'Protect what is due soon', b: `Rent, bills and EMIs falling due are reserved before anything is suggested: ${inr(IN.upcomingObligations)}.` },
  { t: 'Keep a safety margin', b: `A buffer you choose stays untouched: ${inr(IN.safetyMargin)}. Nothing gets recommended from it.` },
  { t: 'What is left is genuinely safe', b: `${inr(UNCAPPED.safeAmount)} remains. If reserved amounts ever exceed your funds, the result floors at ₹0 and the brake pauses saving.` },
  { t: 'Your cap has the final say', b: `A 20% cap turns ${inr(UNCAPPED.safeAmount)} into ${inr(CAPPED.recommended)}. The brake shows Reduce — never more than is safe.` },
]
const LEGEND = [['ess', 'Essentials + commitments', IN.essentialExpenses + IN.recurringCommitments], ['obl', 'Upcoming obligations', IN.upcomingObligations], ['mar', 'Safety margin', IN.safetyMargin]] as const

interface S { ess: number; obl: number; mar: number; glow: number; cap: number; ry: number; num: number }
const H = 5, BASE = -2.5, K = H / IN.balance
const hE = (IN.essentialExpenses + IN.recurringCommitments) * K, hO = IN.upcomingObligations * K, hM = IN.safetyMargin * K
const hSafe = H - hE - hO - hM, hCap = CAPPED.recommended * K

function Scene({ s, onFail }: { s: React.MutableRefObject<S>; onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch { onFail(); return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'
    const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60)
    const root = new THREE.Group(); scene.add(root)
    const W = 1.7
    const mk = (color: number, op: number, emis = 0.35) => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: op, roughness: 0.1, metalness: 0.05, clearcoat: 1, envMapIntensity: 0.55, emissive: color, emissiveIntensity: emis, side: THREE.DoubleSide })
    const box = (color: number, op: number, w = W) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, w), mk(color, op))
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }))
      m.add(e); root.add(m); return { m, e }
    }
    const ess = box(COL.ess, 0.9, W + 0.08), obl = box(COL.obl, 0.9, W + 0.08), mar = box(COL.mar, 0.9, W + 0.08)
    const safe = box(COL.safe, 0.7), ghost = box(0xffffff, 0.0)
    ;(ghost.e.material as THREE.LineBasicMaterial).opacity = 0
    // floor
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.62, 96), new THREE.MeshBasicMaterial({ color: 0x73f5bc, transparent: true, opacity: 0.5, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = BASE - 0.02; root.add(ring)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ color: 0x73f5bc, transparent: true, opacity: 0.07, side: THREE.DoubleSide })); disc.rotation.x = -Math.PI / 2; disc.position.y = BASE - 0.03; root.add(disc)
    const l = new THREE.PointLight(0x73f5bc, 80, 20); l.position.set(4, 3, 5); scene.add(l)
    const l2 = new THREE.PointLight(0xff7c86, 30, 20); l2.position.set(-5, 0, 4); scene.add(l2)

    const size = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.set(0, 0.6, w / h < 0.9 ? 21 : 16); camera.lookAt(0, -0.1, 0); camera.updateProjectionMatrix() }
    size(); const ro = new ResizeObserver(size); ro.observe(el)
    const mint = new THREE.Color(0x2fe3a6), white = new THREE.Color(0x8fa3b0)
    const place = (o: { m: THREE.Mesh; e: THREE.LineSegments }, bottom: number, h: number) => { o.m.scale.y = Math.max(0.0001, h); o.m.position.y = BASE + bottom + h / 2 }

    const stop = visibleLoop(el, t => {
      const v = s.current
      // slide-ins: segments travel in from the sides / above and settle on the stack
      const eased = (x: number) => 1 - Math.pow(1 - x, 3)
      const eE = eased(v.ess), eO = eased(v.obl), eM = eased(v.mar)
      place(ess, 0, hE); ess.m.position.x = (1 - eE) * -6; (ess.m.material as THREE.MeshPhysicalMaterial).opacity = 0.9 * Math.min(1, eE * 2)
      place(obl, hE, hO); obl.m.position.x = (1 - eO) * 6; (obl.m.material as THREE.MeshPhysicalMaterial).opacity = 0.9 * Math.min(1, eO * 2)
      place(mar, hE + hO, hM); mar.m.position.y += (1 - eM) * 4; (mar.m.material as THREE.MeshPhysicalMaterial).opacity = 0.9 * Math.min(1, eM * 2)
      const stack = v.ess * hE + v.obl * hO + v.mar * hM
      const avail = H - stack
      const mintH = avail - v.cap * (avail - hCap)
      place(safe, stack, mintH)
      const sm = safe.m.material as THREE.MeshPhysicalMaterial
      sm.color.copy(white).lerp(mint, v.glow); sm.emissive.copy(sm.color); sm.emissiveIntensity = 0.18 + v.glow * (0.55 + Math.sin(t * 2.2) * 0.1); sm.opacity = 0.5 + v.glow * 0.38
      // ghost = safe-but-not-recommended portion above the cap
      const gh = avail - mintH
      place(ghost, stack + mintH, gh); ghost.m.visible = gh > 0.01
      ;(ghost.m.material as THREE.MeshPhysicalMaterial).opacity = 0.14 * v.cap; (ghost.e.material as THREE.LineBasicMaterial).opacity = 0.45 * v.cap
      root.rotation.y = v.ry + (prefersReduced() ? 0 : Math.sin(t * 0.4) * 0.05)
      root.rotation.x = 0.12
      root.position.y = Math.sin(t * 0.8) * 0.06
      renderer.render(scene, camera)
    })
    return () => { stop(); ro.disconnect(); disposeScene(scene); env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove() }
  }, [s, onFail])
  return <div ref={host} className="story-gl" aria-hidden="true" />
}

function StaticStory() {
  return (
    <div className="grid g3" style={{ marginTop: 28 }}>
      {STEPS.map((x, i) => <div className="card" key={x.t}><div className="eyebrow">Step {i + 1}</div><h3 style={{ margin: '6px 0' }}>{x.t}</h3><p className="muted">{x.b}</p></div>)}
    </div>
  )
}

export default function ScrollStory() {
  const [mode, setMode] = useState<'pending' | 'gl' | 'static'>('pending')
  useEffect(() => { setMode(webglOk() && !prefersReduced() ? 'gl' : 'static') }, [])
  if (mode === 'pending') return <div style={{ minHeight: 600 }} />
  if (mode === 'static') return <StaticStory />
  return <Pinned onFail={() => setMode('static')} />
}

function Pinned({ onFail }: { onFail: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const s = useRef<S>({ ess: 0, obl: 0, mar: 0, glow: 0, cap: 0, ry: -0.7, num: IN.balance })
  const numEl = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      const mobile = window.matchMedia('(max-width: 820px)').matches
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: { trigger: root.current, start: 'top top', end: mobile ? '+=320%' : '+=480%', pin: true, scrub: 0.7, anticipatePin: 1 } })
      const show = (i: number) => { tl.fromTo(q(`.sstep-${i}`), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power3.out' }, i); if (i < STEPS.length - 1) tl.to(q(`.sstep-${i}`), { autoAlpha: 0, y: -24, duration: 0.3 }, i + 0.7) }
      STEPS.forEach((_, i) => show(i))
      const num = (to: number, at: number) => tl.to(s.current, { num: to, duration: 0.7, ease: 'power2.inOut' }, at)
      tl.to(s.current, { ry: 0.5, duration: STEPS.length, ease: 'none' }, 0)
      tl.to(s.current, { ess: 1, duration: 0.8 }, 1); num(IN.balance - IN.essentialExpenses - IN.recurringCommitments, 1); tl.fromTo(q('.leg-ess'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4 }, 1.2)
      tl.to(s.current, { obl: 1, duration: 0.8 }, 2); num(IN.balance - IN.essentialExpenses - IN.recurringCommitments - IN.upcomingObligations, 2); tl.fromTo(q('.leg-obl'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4 }, 2.2)
      tl.to(s.current, { mar: 1, duration: 0.8 }, 3); num(UNCAPPED.safeAmount, 3); tl.fromTo(q('.leg-mar'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4 }, 3.2)
      tl.to(s.current, { glow: 1, duration: 0.8 }, 4); tl.to(q('.pill-normal'), { autoAlpha: 1, duration: 0.3 }, 4.2).fromTo(q('.leg-safe'), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.4 }, 4.2)
      tl.to(s.current, { cap: 1, duration: 0.9 }, 5); num(CAPPED.recommended, 5); tl.to(q('.sv-a'), { autoAlpha: 0, duration: 0.3 }, 5.2).to(q('.sv-b'), { autoAlpha: 1, duration: 0.3 }, 5.2).to(q('.pill-normal'), { autoAlpha: 0, duration: 0.2 }, 5.1).to(q('.pill-reduce'), { autoAlpha: 1, duration: 0.3 }, 5.2)
      tl.to(q('.story-bar'), { scaleX: 1, duration: STEPS.length, ease: 'none' }, 0)
      tl.to({}, { duration: 0.6 }) // hold on the final state
    }, root)
    const unsub = gsap.ticker.add(() => { if (numEl.current) numEl.current.textContent = inr(s.current.num) })
    return () => { gsap.ticker.remove(unsub as unknown as gsap.TickerCallback); ctx.revert() }
  }, [])
  return (
    <div className="story" ref={root}>
      <div className="story-bar-wrap" aria-hidden="true"><i className="story-bar" /></div>
      <div className="story-text">
        <div className="eyebrow">How the brake thinks · scroll</div>
        <div className="story-steps">
          {STEPS.map((x, i) => <div key={x.t} className={`story-step sstep-${i}`} style={{ opacity: i === 0 ? 1 : 0 }}><div className="stepno">0{i + 1}</div><h3>{x.t}</h3><p className="muted">{x.b}</p></div>)}
        </div>
        <div className="legend">
          {LEGEND.map(([k, label, v]) => <div key={k} className={`leg-${k}`} style={{ opacity: 0 }}><span className="dot" style={{ color: CSS[k] }} />{label}<b className="num">−{inr(v)}</b></div>)}
          <div className="leg-safe" style={{ opacity: 0 }}><span className="dot" style={{ color: CSS.safe }} />Safe-to-Save<b className="num mint" style={{ display: 'inline-grid' }}><span className="sv-a" style={{ gridArea: '1/1', textAlign: 'right' }}>{inr(UNCAPPED.safeAmount)}</span><span className="sv-b" style={{ gridArea: '1/1', textAlign: 'right', opacity: 0 }}>{inr(CAPPED.recommended)} (capped)</span></b></div>
        </div>
      </div>
      <div className="story-canvas">
        <Suspense fallback={null}><Scene s={s} onFail={onFail} /></Suspense>
        <div className="story-num glass">
          <div className="eyebrow" style={{ fontSize: 10 }}>Available to save</div>
          <div className="num" ref={numEl} style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em' }}>{inr(IN.balance)}</div>
          <div style={{ position: 'relative', height: 26, marginTop: 4 }}>
            <span className="pill normal pill-normal" style={{ position: 'absolute', opacity: 0 }}>● Brake: Normal</span>
            <span className="pill reduce pill-reduce" style={{ position: 'absolute', opacity: 0 }}>● Brake: Reduce</span>
          </div>
        </div>
      </div>
    </div>
  )
}
