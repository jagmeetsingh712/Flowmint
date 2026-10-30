import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Activity, Compass, Target, ShieldCheck, Lock, Eye, CalendarClock, Gauge, Layers } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import HeroVisual from '../three/HeroVisual'
import { useStore } from '../store'
import { BrakePill, Logo, brakeColor } from '../components/ui'
import { computeSafeToSave, inr } from '../engine/safeToSave'

function BrakeDemo() {
  const [ob, setOb] = useState(6000)
  const r = useMemo(() => computeSafeToSave({ balance: 30000, expectedIncome: 0, essentialExpenses: 2500, recurringCommitments: 600, upcomingObligations: ob, safetyMargin: 1500, capPctOfBalance: 0.2 }), [ob])
  return (
    <div className="glass" data-reveal style={{ padding: 28, marginTop: 32 }}>
      <div className="grid g2" style={{ alignItems: 'center', gap: 32 }}>
        <div className="stack">
          <div className="eyebrow">Try the Financial Safety Brake</div>
          <p className="muted">Illustrative: ₹30,000 balance, ₹2,500 essentials, ₹600 commitments, ₹1,500 safety margin, 20% cap. Drag the upcoming obligations.</p>
          <label htmlFor="ob" className="row between"><span className="label">Upcoming obligations</span><b className="num">{inr(ob)}</b></label>
          <input id="ob" type="range" min={0} max={30000} step={500} value={ob} onChange={e => setOb(Number(e.target.value))} />
        </div>
        <div style={{ textAlign: 'center' }} aria-live="polite">
          <div className="eyebrow">Safe-to-Save</div>
          <div className="big num" style={{ color: brakeColor(r.state), margin: '8px 0 12px' }}>{inr(r.recommended)}</div>
          <BrakePill state={r.state} />
          <p className="hint" style={{ marginTop: 10 }}>{r.reasons[0]}</p>
        </div>
      </div>
    </div>
  )
}

gsap.registerPlugin(ScrollTrigger)
const ScrollStory = lazy(() => import('../three/ScrollStory'))

function useLandingMotion(root: React.RefObject<HTMLDivElement | null>, reducedPref: boolean) {
  useLayoutEffect(() => {
    const reduced = reducedPref || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const ctx = gsap.context(() => {
      // hero entrance
      gsap.set('.hero .line > span', { yPercent: 110 })
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .from('.hero .pill:first-child', { y: 20, autoAlpha: 0, duration: 0.7 })
        .to('.hero .line > span', { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.1)
        .from('.hero .lead, .hero .hero-ctas, .hero .hero-note', { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.5)
        .from('.hero .stage', { autoAlpha: 0, scale: 0.88, duration: 1.4, ease: 'expo.out' }, 0.2)
      // scroll reveals with a 3D tilt-in
      gsap.set('[data-reveal]', { autoAlpha: 0, y: 56, rotateX: 14, transformPerspective: 900, transformOrigin: '50% 100%' })
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%', once: true,
        onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, rotateX: 0, duration: 1, stagger: 0.12, ease: 'power3.out', overwrite: true }),
      })
      // ambient parallax orbs
      gsap.utils.toArray<HTMLElement>('.glow-orb').forEach(o => gsap.to(o, { y: () => -Number(o.dataset.speed || 200), ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } }))
      // step connector line
      gsap.fromTo('.steps-line', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 60%', scrub: true } })
      gsap.utils.toArray<HTMLElement>('.step').forEach((el, i) => gsap.from(el, { rotateY: i % 2 ? 18 : -18, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 55%', scrub: true } }))
      // product preview: laptop flattens as it scrolls in, phone drifts in depth
      gsap.fromTo('.laptop', { rotateX: 38, rotateZ: -5, scale: 0.82, y: 80, transformOrigin: '50% 100%' }, { rotateX: 0, rotateZ: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: '.device-sec', start: 'top 85%', end: 'center 55%', scrub: 0.6 } })
      gsap.fromTo('.phone', { y: 160, rotateY: -28, rotateZ: 6, autoAlpha: 0.4 }, { y: -20, rotateY: -8, rotateZ: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: '.device-sec', start: 'top 70%', end: 'bottom 70%', scrub: 0.8 } })
      // card tilt (mouse only)
      if (window.matchMedia('(hover: hover)').matches) {
        gsap.utils.toArray<HTMLElement>('.feat, .step').forEach(card => {
          const rx = gsap.quickTo(card, 'rotateX', { duration: 0.5, ease: 'power3.out' }), ry = gsap.quickTo(card, 'rotateY', { duration: 0.5, ease: 'power3.out' })
          card.addEventListener('pointermove', (e: PointerEvent) => { const r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx(-((e.clientY - r.top) / r.height - 0.5) * 12) })
          card.addEventListener('pointerleave', () => { rx(0); ry(0) })
        })
      }
    }, root)
    const t = setTimeout(() => ScrollTrigger.refresh(), 600)
    return () => { clearTimeout(t); ctx.revert() }
  }, [root, reducedPref])
}

export default function Landing() {
  const root = useRef<HTMLDivElement>(null)
  const { state } = useStore()
  useLandingMotion(root, state.prefs.reduceMotion)
  return (
    <div ref={root}>
      <div className="atmos" />
      <div className="glow-orb" data-speed="260" style={{ width: 420, height: 420, left: '-8%', top: 900, background: 'rgba(55,214,192,.18)' }} />
      <div className="glow-orb" data-speed="420" style={{ width: 520, height: 520, right: '-10%', top: 2300, background: 'rgba(130,120,255,.16)' }} />
      <div className="glow-orb" data-speed="180" style={{ width: 380, height: 380, left: '30%', top: 3600, background: 'rgba(115,245,188,.14)' }} />
      <header className="lnav glass">
        <Link to="/" className="logo" style={{ padding: 0, fontSize: 18 }} aria-label="FlowMint home"><Logo /></Link>
        <nav aria-label="Sections"><a href="#product">Product</a><a href="#how">How it works</a><a href="#features">Features</a><a href="#security">Security</a></nav>
        <div className="row" style={{ gap: 6 }}><Link className="btn ghost sm" to="/login">Sign in</Link><Link className="btn primary sm" to="/signup">Get started</Link></div>
      </header>

      <main className="wrapper">
        <section className="hero" id="product">
          <div>
            <span className="pill normal"><span className="dot" />Academic prototype · synthetic data</span>
            <h1 style={{ marginTop: 18 }}><span className="line"><span>Save smarter.</span></span><span className="line"><span className="grad">Stay financially safe.</span></span></h1>
            <p className="lead">Fixed savings targets ignore your real life. FlowMint recalculates what you can safely save right now — after rent, bills, EMIs and a protective buffer — so saving never works against you.</p>
            <div className="row wrap hero-ctas"><Link className="btn primary" to="/signup">Get started <ArrowRight size={16} /></Link><Link className="btn" to="/login">Try the demo</Link></div>
            <p className="hint hero-note" style={{ marginTop: 16 }}>Your savings should adapt to your life, not the other way around.</p>
          </div>
          <HeroVisual />
        </section>

        <section aria-labelledby="story-h" style={{ paddingBottom: 8 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }} data-reveal>
            <div className="eyebrow">See the idea</div>
            <h2 id="story-h" style={{ margin: '10px auto 0' }}>Watch a savings number get <span className="grad">earned</span>.</h2>
          </div>
          <Suspense fallback={<div style={{ minHeight: 600 }} />}><ScrollStory /></Suspense>
        </section>

        <section className="block" id="brake" style={{ paddingTop: 0 }}>
          <div className="eyebrow">The Financial Safety Brake</div>
          <h2 style={{ marginTop: 10 }} data-reveal>A savings number that changes when your life does.</h2>
          <p className="sub" data-reveal>Every recommendation reserves upcoming obligations and a safety margin first. When money gets tight, the brake reduces — or pauses — saving instead of letting it collide with an essential payment.</p>
          <BrakeDemo />
          <div className="grid g3" style={{ marginTop: 16 }}>
            {[['Normal', 'normal', 'Healthy position — a positive amount is safe to set aside.'], ['Reduce', 'reduce', 'Obligations or your own cap call for a smaller amount.'], ['Pause', 'pause', 'Funds do not cover what is reserved. Recommend ₹0 and explain why.']].map(([t, c, d]) =>
              <div key={t} className="card" data-reveal><span className={`pill ${c}`}>{t}</span><p className="muted" style={{ marginTop: 10 }}>{d}</p></div>)}
          </div>
        </section>

        <section className="block" id="features">
          <div className="eyebrow">Features</div><h2 style={{ marginTop: 10 }} data-reveal>Built around one safety-first idea.</h2>
          <div className="fgrid">
            {[[Activity, 'Dynamic savings', 'The amount recalculates from your balance, expected income and upcoming payments — not a fixed daily target.'],
              [Compass, 'Financial awareness', 'Cash-flow projection, category spending, recurring-payment detection and plain-language insights.'],
              [Target, 'Personalised goals', 'Emergency fund, education, travel and custom goals with contributions that respect the brake.']].map(([I, t, d]) => {
              const Icon = I as typeof Activity
              return <div className="feat" data-reveal key={t as string}><span className="avatar"><Icon size={20} /></span><h3>{t as string}</h3><p className="muted">{d as string}</p></div>
            })}
          </div>
        </section>

        <section className="block" id="how">
          <div className="eyebrow">How it works</div><h2 style={{ marginTop: 10 }} data-reveal>Three steps to a safer number.</h2>
          <div className="steps"><div className="steps-line" aria-hidden="true" />
            <div className="step"><h3>Tell FlowMint your picture</h3><p className="muted" style={{ marginTop: 6 }}>Balance, income, essentials, recurring commitments and dated obligations.</p></div>
            <div className="step"><h3>The brake does the maths</h3><p className="muted" style={{ marginTop: 6 }}>A transparent rule — never a black box — reserves what you owe and keeps a buffer.</p></div>
            <div className="step"><h3>Save what is genuinely safe</h3><p className="muted" style={{ marginTop: 6 }}>See the amount, the breakdown and the reasons. Nothing moves automatically.</p></div>
          </div>
          <div className="card" data-reveal style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="avatar"><CalendarClock size={20} /></span>
            <div style={{ flex: 1, minWidth: 240 }}><h3>Upcoming obligations are protected first</h3><p className="muted">Rent, utilities, EMIs and subscriptions due inside your planning horizon are subtracted before anything is recommended. Each payment is counted once.</p></div>
            <code className="chip num" style={{ whiteSpace: 'normal' }}>max(0, Balance + Income − Essentials − Commitments − Obligations − Margin)</code>
          </div>
        </section>

        <section className="device-sec" aria-labelledby="dev-h">
          <div style={{ textAlign: 'center' }} data-reveal>
            <div className="eyebrow">The product</div>
            <h2 id="dev-h" style={{ margin: '10px auto 0' }}>One calm screen for a safer decision.</h2>
            <p className="sub" style={{ margin: '14px auto 0' }}>The dashboard shows the recommendation, why it was made, what is coming due and how your goals are affected — on desktop or phone.</p>
          </div>
          <div style={{ position: 'relative' }}>
            <div className="laptop"><div className="bar-top" aria-hidden="true"><i /><i /><i /></div><img src="/preview-dashboard.jpg" alt="FlowMint dashboard showing a Safe-to-Save amount, cash-flow outlook and upcoming payments (synthetic demo data)" loading="lazy" width="1366" height="860" /></div>
            <div className="phone"><img src="/preview-mobile.jpg" alt="FlowMint mobile dashboard (synthetic demo data)" loading="lazy" width="390" height="800" /></div>
          </div>
        </section>

        <section className="block" id="security">
          <div className="eyebrow">Transparency &amp; privacy</div><h2 style={{ marginTop: 10 }} data-reveal>Honest about what it is — and isn't.</h2>
          <div className="fgrid">
            {[[Eye, 'Every step visible', 'Inputs, intermediate values and reasons are shown. The calculation is rule-based and independently tested.'],
              [Lock, 'No banking credentials', 'FlowMint never asks for bank passwords, UPI PINs or OTPs and does not connect to bank accounts.'],
              [Layers, 'Clearly labelled estimates', 'Demo data is synthetic, categories are estimates, and recommendations are not financial advice.']].map(([I, t, d]) => {
              const Icon = I as typeof Eye
              return <div className="feat" data-reveal key={t as string}><span className="avatar"><Icon size={20} /></span><h3>{t as string}</h3><p className="muted">{d as string}</p></div>
            })}
          </div>
        </section>

        <section className="cta glass" data-reveal>
          <ShieldCheck size={34} className="mint" /><h2 style={{ fontSize: 'clamp(28px,4vw,44px)', margin: '14px auto', maxWidth: 640 }}>See what is safe to save today.</h2>
          <p className="muted" style={{ marginBottom: 24 }}>Explore with synthetic data in seconds — no bank connection needed.</p>
          <div className="row wrap" style={{ justifyContent: 'center' }}><Link to="/signup" className="btn primary">Get started <ArrowRight size={16} /></Link><Link to="/login" className="btn"><Gauge size={16} />Enter demo</Link></div>
        </section>
      </main>

      <footer className="footer"><div className="wrapper row between wrap">
        <span>© FlowMint — an academic prototype (B.Tech project). Not a bank, adviser or licensed financial product.</span>
        <span>Recommendations are estimates, not financial advice.</span></div></footer>
    </div>
  )
}
