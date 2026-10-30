import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { disposeScene, prefersReduced, visibleLoop } from './util'

gsap.registerPlugin(ScrollTrigger)

/** Original mint-glass gem with orbiting coins and drifting particles. Pointer + scroll reactive. */
export default function HeroScene({ onFail }: { onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch { onFail(); return }
    const reduced = prefersReduced()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    el.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block'

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)
    camera.position.set(0, 0.15, 9)

    const group = new THREE.Group(); scene.add(group)

    // --- gem: lathe profile → 8-facet brilliant silhouette
    const prof = [[0, -1.55], [0.98, 0.12], [1.04, 0.3], [0.62, 0.85], [0, 0.85]].map(([x, y]) => new THREE.Vector2(x, y))
    const gemGeo = new THREE.LatheGeometry(prof, 8)
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0x1fd9a0, metalness: 0.15, roughness: 0.06, transparent: true, opacity: 0.9, ior: 1.9, reflectivity: 1,
      clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9, flatShading: true, side: THREE.DoubleSide,
      emissive: 0x0a7a5e, emissiveIntensity: 0.7,
    })
    const gem = new THREE.Mesh(gemGeo, gemMat)
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(gemGeo, 12), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }))
    const core = new THREE.Mesh(gemGeo, new THREE.MeshBasicMaterial({ color: 0x73f5bc, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
    core.scale.setScalar(0.52); core.position.y = -0.05
    const gemRig = new THREE.Group(); gemRig.add(gem, edges, core); gemRig.scale.setScalar(1.05)
    group.add(gemRig)

    // --- orbit: ring + coins
    const orbit = new THREE.Group(); orbit.rotation.x = Math.PI / 2.35; orbit.rotation.z = 0.25; group.add(orbit)
    orbit.add(new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.007, 8, 180), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })))
    const coinGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 48)
    const coinMat = new THREE.MeshStandardMaterial({ color: 0x37d6c0, metalness: 1, roughness: 0.22, envMapIntensity: 1.0 })
    const coins: THREE.Mesh[] = []
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(coinGeo, coinMat); orbit.add(c); coins.push(c) }

    // --- particles
    const N = 170, pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) { const r = 2.8 + Math.random() * 3.2, a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); pos[i * 3] = r * Math.sin(b) * Math.cos(a); pos[i * 3 + 1] = r * Math.cos(b) * 0.8; pos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a) - 1 }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9ffbd8, size: 0.035, transparent: true, opacity: 0.7, sizeAttenuation: true, depthWrite: false }))
    scene.add(points)

    // --- lights
    const l1 = new THREE.PointLight(0x73f5bc, 60, 14); l1.position.set(3.5, 2.5, 3.5); scene.add(l1)
    const l2 = new THREE.PointLight(0x9fb4ff, 40, 14); l2.position.set(-3.5, -1.5, 3); scene.add(l2)

    // --- sizing
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1
      renderer.setSize(w, h, false); camera.aspect = w / h
      camera.position.z = w / h < 0.9 ? 11 : 9
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(el)

    // --- interaction
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
    }
    if (!reduced) window.addEventListener('pointermove', onMove)
    const sc = { p: 0 }
    const st = reduced ? null : gsap.to(sc, { p: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: 0.8 } })

    const stop = visibleLoop(el, t => {
      cur.x += (target.x - cur.x) * 0.06; cur.y += (target.y - cur.y) * 0.06
      const tt = reduced ? 0 : t
      gemRig.rotation.y = tt * 0.35 + cur.x * 0.7 + sc.p * Math.PI * 1.2
      gemRig.rotation.x = cur.y * 0.25 + sc.p * 0.3
      gemRig.rotation.z = Math.sin(tt * 0.5) * 0.05
      group.position.y = Math.sin(tt * 0.9) * 0.14 + sc.p * 1.4
      group.scale.setScalar(1 - sc.p * 0.3)
      orbit.rotation.y = tt * 0.25 + cur.x * 0.3
      coins.forEach((c, i) => { const a = (i / coins.length) * 6.283 + tt * 0.55; c.position.set(Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0); c.rotation.set(Math.PI / 2 + Math.sin(tt + i) * 0.3, tt * 1.5 + i, 0) })
      points.rotation.y = tt * 0.02 + cur.x * 0.05
      core.material.opacity = 0.3 + Math.sin(tt * 1.4) * 0.1
      l1.position.x = 3.5 + cur.x * 1.5; l1.position.y = 2.5 - cur.y * 1.2
      renderer.render(scene, camera)
    })

    return () => {
      stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove)
      st?.scrollTrigger?.kill(); st?.kill()
      disposeScene(scene); envTex.dispose(); pmrem.dispose(); renderer.dispose()
      renderer.domElement.remove()
    }
  }, [onFail])
  return <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />
}
