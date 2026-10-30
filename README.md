# FlowMint — Save Smarter. Stay Financially Safe.

An AI-assisted dynamic savings recommendation prototype (B.Tech academic project, *"AI-Based Dynamic Savings Recommendation Platform"*). FlowMint computes how much a user can **safely** save right now — after reserving essentials, recurring commitments, upcoming obligations and a safety margin.

> **Prototype notice:** all data is synthetic and stored only in your browser. FlowMint does not connect to bank accounts, never asks for banking passwords / UPI PINs / OTPs, moves no money, and its recommendations are estimates, not financial advice.

## Financial Safety Brake

```
Safe-to-Save = max(0, Balance + Expected Income − Essentials − Recurring Commitments − Upcoming Obligations − Safety Margin)
```

Implemented in [`src/engine/safeToSave.ts`](src/engine/safeToSave.ts) as a pure, deterministic, rule-based function (no UI or ML involved).

| State | Meaning |
|---|---|
| NORMAL | Positive safe amount, nothing limiting it |
| REDUCE | A cap (or the current-balance limit) binds, or reserved outflows use ≥ 60% of funds |
| PAUSE | Raw result ≤ 0 → recommend ₹0 and explain why |

Documented default policies (design parameters from the synopsis, not research findings): cap applied only *after* the zero floor; the recommendation never exceeds the safe amount **or** the balance held today; stricter of % cap and absolute cap wins; irregular income counted at 70%; each payment counted once (fixed bills live in dated payments, `essentialMonthly` covers only variable essentials).

## 3D hero
Three.js WebGL gem with an orbiting ring of coins (lazy-loaded, pointer reactive). Falls back to the SVG crystal without WebGL.

## Features
Landing page with 3D mint-glass crystal (SVG + CSS 3D, no WebGL, reduced-motion aware) and an interactive brake demo · sign up / sign in (local, PBKDF2-hashed, clearly *not* production auth) · demo mode with 4 synthetic personas · 4-step onboarding · dashboard (Safe-to-Save, 6 summary cards, cash-flow projection, upcoming payments with "mark paid", goals, insights, activity) · what-if calculator with breakdown · searchable/filterable transactions with add/edit/delete · goals CRUD with brake-respecting contribution suggestions · insights (monthly trend, category spend, income variability, recurring detection, forecast) · settings, privacy mode, demo reset, delete local data.

Every screen derives from one shared model (`src/engine/finance.ts`), so figures are consistent across dashboard, calculator, charts and goals.

## "AI" honesty
- Categorisation: transparent keyword rules (labelled *estimates*).
- Recurring detection: deterministic rules (≥3 similar monthly payments).
- Forecast: naive / 4-week moving average / exponential smoothing compared by held-out MAE on synthetic data. **No ML model is trained and no accuracy is claimed.**
- Synthetic data: seeded PRNG (`src/data/seed.ts`), reproducible.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + data-model tests (vitest)
npm run build
```
No environment variables are required (see `.env.example`).

## Tests
`npm test` covers the three synopsis regression scenarios (₹1,400 · ₹19,400 → ₹6,000 with 20% cap · ₹0 + PAUSE), zero floor, input validation, a 500-case property sweep (recommendation ≤ safe amount), no double-counting, and dashboard/chart/calculator consistency across all four personas.

## Limitations
- Frontend-only: no FastAPI/SQLite backend; persistence is `localStorage`.
- Local demo auth only; use real auth (e.g. an identity provider) before any production use.
- Forecasting is a statistical baseline; no trained ML; Account Aggregator integration is future scope.
- Invest / Redeem stages of the synopsis are out of scope.

## Deploy
Static site: `npm run build` and deploy `dist/` to Vercel/Netlify/GitHub Pages (add an SPA fallback to `index.html`).
