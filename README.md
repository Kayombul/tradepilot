# TradePilot

Next.js personal forex practice workspace for FxPro Standard / MT5. No paid API, subscription or hosted database is required to run locally.

## Run

Install Node.js 20.9 or later, then run `npm install` and `npm run dev`. Open http://localhost:3000. Run `npm test` for engine checks and `npm run build` for production verification.

## Workflow

1. Import completed H1 and H4 OHLC candles in Plan. CSV columns: `time,open,high,low,close`. Use ISO timestamps with timezone offsets. MT5 date/time TSV exports are supported, but timestamps without offsets are interpreted as UTC: convert broker timestamps first.
2. Mark an H4 zone and select buy or sell. Inspect the imported chart and rule explanation. Historical or stale imports are for practice only.
3. Configure and verify your actual account's symbol specifications in Settings. Risk sizing is blocked until these are supplied. USD account assumed. Do not use guessed tick values for gold or JPY pairs.
4. Save a practice plan. Sizing-blocked plans have unspecified volume and initial dollar risk; they cannot produce meaningful R metrics.
5. Record manual stop adjustments and net realised outcomes. All orders remain manual and outside this app.
6. Export backups frequently and before clearing browser data. Records are browser-local, not automatically synced between devices or backed up by GitHub.

Sample prices are invented historical data for interface demonstration, not actual broker prices.

## Strategy

H4 zones → H1 breakout → retest → momentum or three-candle rejection confirmation. Momentum requires at least 20 previous H1 candles. Defaults: body/range >= 75%, range >= 1.2 times previous median; rejection wick >= 50% of range and twice the body. Editable, experimental settings.

Three directional candles are a protection-review prompt, not an automated stop adjustment. Confirmed higher lows / lower highs guide tightening. The engine counts directional candles and identifies post-entry swings using two completed candles on either side plus continuation confirmation. Stops remain manual. Addition checks require fresh momentum confirmation, previous stop protection, verified sizes and combined risk/margin within configured allowances. Practice campaigns are capped at five open positions. Additions must share instrument and direction.

## Implemented

- Responsive Today, Plan, Campaign, Journal, Review and Settings screens.
- CSV/TSV OHLC imports, manual H4 zones, SVG charts and basic rule engine.
- Broker-specification-based lot sizing, minimum-volume and margin checks.
- Browser-local practice plans, stop history, realised outcomes, basic instrument analytics, JSON export/restore.

## Follow-up work

- Fair paired historical management comparisons (manual method summaries are included).
- MT5 trade-history import (plan screenshots are included).
- Configurable setup expiry and broader swing/confirmation tests. Three-candle review prompts, two-sided swing confirmation and campaign addition checks are included.
- Future backup schema migration. Current backups have schema and financial-field checks.
- Broader end-to-end testing across imported datasets and devices.
- Live broker connectivity and optional cross-device storage.

Live MT5 connectivity and automated historical backtesting are later work. No trading automation or profit guarantees.

## GitHub

Local Git history preserves source code only. Create a private GitHub repository named `tradepilot`, add its URL as `origin`, and push the `main` branch. Never commit broker credentials or personal trade exports. Lockfile is committed for reproducible dependency installation.

## Public source and hosting

Source: https://github.com/Kayombul/tradepilot . GitHub Actions tests and builds the static export, then publishes to GitHub Pages. No broker passwords or journal records belong in this repository. Browser-local records remain private to that browser, even though application code is public.

`npm run dev -- --port 3010` starts the local preview. With `output: export`, production is served from `out/` using a static web server; `next start` does not serve static exports. GitHub builds use `/tradepilot` as the base path.
