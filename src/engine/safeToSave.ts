/**
 * Financial Safety Brake — deterministic, rule-based Safe-to-Save engine.
 *
 * Safe-to-Save = max(0, Balance + ExpectedIncome − EssentialExpenses
 *                       − RecurringCommitments − UpcomingObligations − SafetyMargin)
 *
 * All amounts are INR, normalised to whole rupees (rounded to 2 decimals internally).
 * The cap is applied only AFTER the non-negative safe amount is computed, so the
 * recommendation can never exceed the safe amount.
 */
export type BrakeState = 'NORMAL' | 'REDUCE' | 'PAUSE'

export interface SafeToSaveInput {
  balance: number
  expectedIncome: number
  essentialExpenses: number
  recurringCommitments: number
  upcomingObligations: number
  safetyMargin: number
  /** Optional cap as a fraction (0–1) of available balance, e.g. 0.2 = 20%. */
  capPctOfBalance?: number | null
  /** Optional absolute cap in INR. The stricter of the two caps wins. */
  capAbsolute?: number | null
  /** Planning horizon in days (informational; inputs are assumed already scoped to it). */
  horizonDays?: number
}

export interface SafeToSaveResult {
  rawSafe: number          // before zero floor (may be negative)
  safeAmount: number       // max(0, rawSafe)
  recommended: number      // after cap; always ≤ safeAmount
  capApplied: boolean
  capLimit: number
  state: BrakeState
  reasons: string[]
  breakdown: { label: string; value: number; sign: 1 | -1 }[]
  errors: string[]
}

/** Policy: a capped result, or a result where reserved outflows consume ≥ 60% of funds, is REDUCE. */
export const REDUCE_PRESSURE_THRESHOLD = 0.6

const FIELDS: (keyof SafeToSaveInput)[] = [
  'balance', 'expectedIncome', 'essentialExpenses', 'recurringCommitments', 'upcomingObligations', 'safetyMargin',
]
const r2 = (n: number) => Math.round(n * 100) / 100

export function validateInput(i: SafeToSaveInput): string[] {
  const errs: string[] = []
  for (const f of FIELDS) {
    const v = i[f] as number
    if (typeof v !== 'number' || !Number.isFinite(v)) errs.push(`${f} must be a finite number`)
    else if (v < 0) errs.push(`${f} cannot be negative`)
  }
  if (i.capPctOfBalance != null && (i.capPctOfBalance < 0 || i.capPctOfBalance > 1)) errs.push('capPctOfBalance must be between 0 and 1')
  if (i.capAbsolute != null && i.capAbsolute < 0) errs.push('capAbsolute cannot be negative')
  return errs
}

export const inr = (n: number) =>
  '₹' + Math.round(n).toLocaleString('en-IN')

export function computeSafeToSave(input: SafeToSaveInput): SafeToSaveResult {
  const errors = validateInput(input)
  const empty: SafeToSaveResult = {
    rawSafe: 0, safeAmount: 0, recommended: 0, capApplied: false, capLimit: 0, state: 'PAUSE',
    reasons: ['Inputs are invalid, so no saving is recommended until they are corrected.'],
    breakdown: [], errors,
  }
  if (errors.length) return empty

  const balance = r2(input.balance), income = r2(input.expectedIncome)
  const essentials = r2(input.essentialExpenses), recurring = r2(input.recurringCommitments)
  const obligations = r2(input.upcomingObligations), margin = r2(input.safetyMargin)

  const reserved = essentials + recurring + obligations + margin
  const rawSafe = r2(balance + income - reserved)
  const safeAmount = Math.max(0, rawSafe)

  // Cap is applied after the floor; stricter of the configured caps wins.
  // A recommendation can never exceed what is actually held today (expected income may not have arrived yet).
  const caps: number[] = [balance]
  if (input.capPctOfBalance != null) caps.push(r2(balance * input.capPctOfBalance))
  if (input.capAbsolute != null) caps.push(r2(input.capAbsolute))
  const capLimit = Math.min(...caps)
  const recommended = Math.min(safeAmount, capLimit)
  const capApplied = capLimit < safeAmount

  const funds = balance + income
  const pressure = funds > 0 ? (essentials + recurring + obligations) / funds : 1
  let state: BrakeState
  const reasons: string[] = []

  if (rawSafe <= 0) {
    state = 'PAUSE'
    reasons.push(`Funds of ${inr(funds)} do not cover reserved outflows of ${inr(reserved)} (including a ${inr(margin)} safety margin). Saving is paused.`)
    reasons.push(`Shortfall: ${inr(Math.abs(rawSafe))}. Upcoming obligations are the first thing to review.`)
  } else if (capApplied || pressure >= REDUCE_PRESSURE_THRESHOLD) {
    state = 'REDUCE'
    if (capApplied) reasons.push(capLimit === balance ? `Safe-to-Save is ${inr(safeAmount)}, but only ${inr(balance)} is in your account today, so the recommendation is limited to what you hold.` : `Your cap of ${inr(capLimit)} limits the recommendation below the ${inr(safeAmount)} that is technically safe.`)
    if (pressure >= REDUCE_PRESSURE_THRESHOLD) reasons.push(`Essentials, commitments and obligations use ${Math.round(pressure * 100)}% of available funds, so a smaller amount is advised.`)
  } else {
    state = 'NORMAL'
    reasons.push(`After reserving ${inr(reserved)}, ${inr(rawSafe)} remains safely available.`)
  }
  if (obligations > 0 && state !== 'PAUSE') reasons.push(`${inr(obligations)} of upcoming obligations is already set aside.`)
  if (income === 0 && state !== 'PAUSE') reasons.push('No income is expected in this horizon, so the estimate relies on current balance only.')

  return {
    rawSafe, safeAmount, recommended, capApplied, capLimit, state, reasons, errors: [],
    breakdown: [
      { label: 'Available balance', value: balance, sign: 1 },
      { label: 'Expected income', value: income, sign: 1 },
      { label: 'Essential expenses', value: essentials, sign: -1 },
      { label: 'Recurring commitments', value: recurring, sign: -1 },
      { label: 'Upcoming obligations', value: obligations, sign: -1 },
      { label: 'Safety margin', value: margin, sign: -1 },
    ],
  }
}
