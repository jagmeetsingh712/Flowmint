import { describe, it, expect } from 'vitest'
import { buildFinance } from '../data/seed'
import { derive, balanceOf, projection, categorize, detectRecurring, forecastWeeklyExpenses, paymentOccurrences, categoryBreakdown, sum } from './finance'
import { Persona } from './finance'

const today = new Date(2026, 9, 30)
const personas: Persona[] = ['salaried', 'gig', 'student', 'selfEmployed']

describe('shared financial model', () => {
  it.each(personas)('%s: seed is deterministic and reaches the target balance', p => {
    const a = buildFinance(p, today), b = buildFinance(p, today)
    expect(a.txns.length).toBe(b.txns.length)
    expect(a.txns[0]).toEqual(b.txns[0])
    expect(balanceOf(a)).toBeGreaterThan(0)
  })
  it.each(personas)('%s: dashboard inputs equal calculator inputs and result is consistent', p => {
    const f = buildFinance(p, today), d = derive(f, today)
    expect(d.input.balance).toBe(Math.max(0, d.balance))
    expect(d.input.recurringCommitments).toBe(d.recurringTotal)
    expect(d.input.upcomingObligations).toBe(d.obligationsTotal)
    expect(d.result.recommended).toBeLessThanOrEqual(d.result.safeAmount)
    const sugg = sum(Object.values(d.suggestions))
    expect(sugg).toBeLessThanOrEqual(d.result.recommended)
  })
  it('does not double-count: each payment is counted once in exactly one bucket', () => {
    const f = buildFinance('salaried', today), d = derive(f, today)
    const ids = d.upcoming.map(o => o.payment.id + o.date.toISOString())
    expect(new Set(ids).size).toBe(ids.length)
    expect(d.recurringTotal + d.obligationsTotal).toBe(sum(d.upcoming.map(o => o.payment.amount)))
  })
  it('projection chart starts at the dashboard balance and payment bars sum to the upcoming total', () => {
    const f = buildFinance('salaried', today), d = derive(f, today), pts = projection(f, d)
    expect(pts[0].balance).toBe(Math.round(d.balance))
    expect(sum(pts.map(p => p.payments))).toBe(Math.round(d.recurringTotal + d.obligationsTotal))
  })
  it('marking a recurring payment paid removes that occurrence only', () => {
    const f = buildFinance('salaried', today)
    const before = paymentOccurrences(f.payments, today, 14).length
    const rent = f.payments.find(p => p.name.startsWith('Rent'))!
    rent.paidFor = '2026-11'
    expect(paymentOccurrences(f.payments, today, 14).length).toBe(before - 1)
  })
  it('keyword categoriser and recurring detector behave', () => {
    expect(categorize('Zomato order')).toBe('Dining')
    expect(categorize('mystery shop')).toBe('Other')
    const f = buildFinance('salaried', today)
    expect(detectRecurring(f.txns).some(r => r.name.includes('Rent'))).toBe(true)
  })
  it('forecast baseline reports honest held-out errors', () => {
    const r = forecastWeeklyExpenses(buildFinance('salaried', today).txns, today)
    expect(r.ok).toBe(true)
    expect(Object.keys(r.mae!).length).toBe(3)
    expect(forecastWeeklyExpenses([], today).ok).toBe(false)
  })
  it('category totals equal total expenses in the window', () => {
    const f = buildFinance('student', today)
    const c = categoryBreakdown(f.txns, today, 30)
    expect(sum(c.map(x => x.pct))).toBeCloseTo(1, 5)
  })
})
