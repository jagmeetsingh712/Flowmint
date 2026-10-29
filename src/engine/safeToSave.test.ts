import { describe, it, expect } from 'vitest'
import { computeSafeToSave, SafeToSaveInput } from './safeToSave'

const base: SafeToSaveInput = {
  balance: 12000, expectedIncome: 0, essentialExpenses: 2500,
  recurringCommitments: 600, upcomingObligations: 6000, safetyMargin: 1500,
}

describe('Safe-to-Save engine', () => {
  it('scenario 1: ₹1,400 before cap', () => {
    const r = computeSafeToSave(base)
    expect(r.safeAmount).toBe(1400)
    expect(r.recommended).toBe(1400)
  })
  it('scenario 2: ₹19,400 raw, 20% cap of balance → ₹6,000', () => {
    const r = computeSafeToSave({ ...base, balance: 30000 })
    expect(r.safeAmount).toBe(19400)
    const c = computeSafeToSave({ ...base, balance: 30000, capPctOfBalance: 0.2 })
    expect(c.recommended).toBe(6000)
    expect(c.capApplied).toBe(true)
    expect(c.state).toBe('REDUCE')
  })
  it('scenario 3: obligations ₹11,000 → ₹0 and PAUSE', () => {
    const r = computeSafeToSave({ ...base, upcomingObligations: 11000 })
    expect(r.recommended).toBe(0)
    expect(r.state).toBe('PAUSE')
    expect(r.rawSafe).toBeLessThan(0)
  })
  it('floors negative results at zero', () => {
    const r = computeSafeToSave({ ...base, balance: 0 })
    expect(r.safeAmount).toBe(0)
    expect(r.recommended).toBe(0)
  })
  it('PAUSE when raw result is exactly zero', () => {
    const r = computeSafeToSave({ ...base, balance: 10600 })
    expect(r.rawSafe).toBe(0)
    expect(r.state).toBe('PAUSE')
  })
  it('rejects invalid inputs', () => {
    expect(computeSafeToSave({ ...base, balance: -1 }).errors.length).toBeGreaterThan(0)
    expect(computeSafeToSave({ ...base, balance: NaN }).recommended).toBe(0)
    expect(computeSafeToSave({ ...base, capPctOfBalance: 1.5 }).state).toBe('PAUSE')
  })
  it('recommendation never exceeds safe amount (property sweep)', () => {
    let seed = 42
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
    for (let k = 0; k < 500; k++) {
      const i: SafeToSaveInput = {
        balance: rnd() * 100000, expectedIncome: rnd() * 50000, essentialExpenses: rnd() * 30000,
        recurringCommitments: rnd() * 10000, upcomingObligations: rnd() * 40000, safetyMargin: rnd() * 5000,
        capPctOfBalance: rnd() < 0.5 ? rnd() : null, capAbsolute: rnd() < 0.3 ? rnd() * 20000 : null,
      }
      const r = computeSafeToSave(i)
      expect(r.recommended).toBeGreaterThanOrEqual(0)
      expect(r.recommended).toBeLessThanOrEqual(r.safeAmount)
    }
  })
  it('changing inputs changes recommendation and explanation', () => {
    const a = computeSafeToSave(base), b = computeSafeToSave({ ...base, expectedIncome: 5000 })
    expect(b.recommended).toBe(a.recommended + 5000)
    expect(b.reasons.join()).not.toEqual(a.reasons.join())
  })
  it('never recommends more than the balance held today', () => {
    const r = computeSafeToSave({ ...base, balance: 5000, expectedIncome: 90000 })
    expect(r.safeAmount).toBeGreaterThan(5000)
    expect(r.recommended).toBe(5000)
    expect(r.state).toBe('REDUCE')
  })
  it('stricter of percentage and absolute caps wins', () => {
    const r = computeSafeToSave({ ...base, balance: 30000, capPctOfBalance: 0.2, capAbsolute: 3000 })
    expect(r.recommended).toBe(3000)
  })
})
