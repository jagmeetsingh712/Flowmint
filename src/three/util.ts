import * as THREE from 'three'

export function webglOk(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}
export function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'true'
}
export function disposeScene(scene: THREE.Scene) {
  scene.traverse(o => {
    const m = o as THREE.Mesh
    m.geometry?.dispose?.()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose?.()
  })
}
/** Runs `render` every frame only while the host is on screen and the tab is visible. */
export function visibleLoop(host: Element, render: (t: number) => void) {
  let raf = 0, visible = true
  const tick = (t: number) => { if (!visible || document.hidden) { raf = 0; return } render(t / 1000); raf = requestAnimationFrame(tick) }
  const start = () => { if (!raf) raf = requestAnimationFrame(tick) }
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start() }, { threshold: 0 })
  io.observe(host)
  const vis = () => { if (!document.hidden) start() }
  document.addEventListener('visibilitychange', vis)
  start()
  return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(raf); raf = 0; visible = false }
}
