# Real-Time Portfolio Tracker

A cryptocurrency portfolio tracker that streams live prices from Binance over WebSockets, renders a virtualized holdings table, an order-book/depth panel, and a candlestick chart with a moving-average overlay — all without a single setInterval poll.

## Features

- **Live market data via Binance WebSocket** — 20 high-liquidity USDT pairs streamed over one combined stream; no REST polling.
- **Virtualized holdings table** — 20 fully-streamed rows with windowed rendering (`@tanstack/react-virtual`), search, and multi-key sorting. Every row always has live data (see "Why 20 coins" below).
- **Order book / depth panel** — top 20 bids/asks per selected symbol, with relative-quantity depth bars, mid and spread.
- **Candlestick chart** — 300-candle history (REST) + live kline stream, SMA-20 overlay, 1m/5m/15m/1h intervals (`lightweight-charts`).
- **Portfolio summary** — live total value, cost basis, and gain/loss over a rolling session, plus a value-over-time chart.
- **Price alerts** — per-coin threshold alerts (above/below) with in-app toasts, optional browser Notifications, a header bell with badge + management panel, and bell indicators on alert rows. One-shot: an alert fires once, then removes itself.
- **Motion** — Framer Motion price pulse on ticks, spring row-reorder on sort, fade/slide on coin switch, animated toasts/dialogs (`MotionConfig reducedMotion="user"` respected).
- **Selective per-row re-rendering** — a Zustand store with granular selectors means a single coin's tick re-renders only that row and ticker item.
- **Resilient connections** — exponential-backoff reconnection, stale-socket watchdog, manual retry, live/reconnecting/error status UI.
- **Error-boundary isolation** — the table, chart, order book, ticker, summary, and portfolio chart are each wrapped in their own boundary, so a crash in one renders a per-section fallback instead of taking down the app.
- **Graceful degradation** — anything missing live data shows a "No data available" pill or skeleton loaders (order book, chart, portfolio chart) instead of blank cells or dashes.
- **Dark / light themes** (persisted, system-aware, no-flash init script), deterministic calibrated holdings.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript (verbatim module syntax) |
| Build | Vite 8 + Rolldown |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| State | Zustand 5 (market store + granular selectors, alert store + localStorage) |
| Charts | `lightweight-charts` 5 (candles), Recharts (portfolio area) |
| Animation | Framer Motion (price pulse, row reorder, transitions, toasts) |
| Virtualization | `@tanstack/react-virtual` |
| Tests | Jest 30 + `@swc/jest` + Testing Library (jsdom) |
| Lint | oxlint |

## Getting Started

```bash
npm install
npm run dev       # start the dev server
```

```bash
npm run build     # tsc -b && vite build (type-checks + bundles)
npm run lint      # oxlint
npm test          # jest (unit + component + websocket pipeline tests)
npm run test:watch
```

## Architecture

### Data flow

```
Binance WS (combined /stream)
        │  ticker events (~1s/pair)
        ▼
services/marketStream.ts  ← the market "controller"
  • batches raw ticks, flushes every 100 ms
  • applies merge that keeps unchanged price objects referentially stable
  • samples a portfolio-history point at most every 5 s
  • owns reconnection/backoff + stale watchdog
        ▼  writes to
store/marketStore.ts  (Zustand, plain state + actions)
        ▼  components subscribe with SELECTORS
  HoldingsTableRow / TickerItem   → state.prices[coin.id]   (per-row)
  HoldingsTable                   → state.prices             (for sorting)
  Header                          → connectionStatus, lastUpdated
  PortfolioChart                  → history
  OrderBook / CandleChart         → selectedCoinId
```

### Why 20 coins, not 130?

The catalog once held 130 pairs with 130 generated holdings — but catalogs rot: BUSD was delisted, MATIC migrated to POL, AGIX/OCEAN merged into FET. Those pairs never emit `@ticker` events, so their rows could never have data no matter how we subscribed. Rather than stream dead symbols, the live portfolio is scoped to `PORTFOLIO_SYMBOLS`: 20 high-liquidity pairs with verified streams. The stream subscribes to exactly this set, holdings cover exactly this set, and the order-book picker offers exactly this set — so every row is complete, always. (The full 130-symbol catalog remains in `data/coins.ts` untouched.)

Mock quantities/buy-prices are hand-calibrated against live Binance prices: 10 winners, 10 losers, ≈ +3.5% overall — inside the −10%…+20% band with room for market drift.

### Price alerts

Alerts live in a separate `store/alertStore.ts` (persisted to localStorage; toasts/dialog state are session-only) so the hot market-data path is untouched. `hooks/useAlertWatcher.ts` subscribes to the market store once and compares previous vs. current price per alert on each flush; `utils/alerts.ts:checkAlertCrossed` is the pure crossing predicate (strict on the old side, inclusive on the new side). On cross: one-shot remove + in-app toast (click jumps to the coin's chart) + `new Notification(...)` if permission was granted (requested in the save-click gesture, plus an explicit enable button in the header panel).

### Why Zustand + selectors?

- A WebSocket tick lands every ~1 s per symbol, roughly 10–100 times per second across the board.
- Components subscribe to exactly the slice they need. Zustand compares selected values with `Object.is`; because `applyTickerUpdate` returns the same object reference for an unchanged price, a BTC tick re-renders **only** the BTC row and BTC ticker item — the other 19 rows skip entirely.
- The table subscribes to the whole map deliberately: sorting requires a complete view. Single-consumer, high-churn data (order-book depth) stays in a local hook on purpose — pushing it into the store would churn subscribers for nothing.

### Why WebSocket instead of polling?

The previous version polled a REST API every 15 s (all coins per poll). Binance's `@ticker` stream pushes every symbol's price every ~1 s over a single socket. That's a ~15x fresher UI for less network traffic. The cost is state-machine complexity (reconnects, staleness, message format), which lives in `services/marketStream.ts` so components never see it.

### Rendering pipeline decisions

- **Row memoization + stable props.** `HoldingsTableRow` is `memo`-ized; props are a stable coin object, a deterministic holding, and a primitive virtual offset. Callers never pass mutable price props — the row reads its price from the store.
- **Virtualizer row keys** are coin ids (stable under sort), so scrolling preserves DOM rows and their effects. Row position is driven by Framer Motion (`animate={{ y }}` spring), which doubles as the sort-reorder glide.
- **Price pulse without direction state.** The price number remounts on each tick (`key={usd}`) and plays a scale/brightness pop; direction color still comes from the existing row flash. No prev-price ref needed in the component.
- **100 ms tick batching.** React re-render cost is per-batch, not per-message; 100 ms is the sweet spot between perceptual latency and render load.
- **History sampling** is throttled to one point per 5 s and capped at 240 points — the portfolio chart doesn't need 20 points/sec.
- **Imperative chart, declarative bridge.** lightweight-charts is a canvas API; the chart/series are created once in refs and fed via effects (`setData`/`applyOptions`), preserving user pan/zoom across data updates.

### Connection reliability

- Exponential backoff: `1s → 2s → 4s → … → 30s`, max 30 attempts, then a terminal `error` state with manual retry.
- Stale-socket watchdog: if no message arrives for 45 s the socket is force-closed and reconnection kicks in (Binance drops idle/24 h connections).
- Banners + status dots reflect `connecting / open / reconnecting / error` everywhere.

## Performance

This app streams 20 symbols at ~1 update/sec each. Every optimization below exists to keep per-tick work proportional to what actually changed, not to the size of the app. Measurable wins:

- **Virtualized table rendering.** Only the visible rows exist in the DOM (plus overscan). `@tanstack/react-virtual` positions rows absolutely inside a fixed-height body with a `table-fixed` layout so column widths are stable.
- **Granular Zustand selectors + referentially stable prices.** Components subscribe to exactly the slice they render: rows/ticker items select `state.prices[coin.id]`, the table selects the whole map (it must, to sort), the chart selects `selectedCoinId`. `applyTickerUpdate` only creates a new price object when the value actually changed, so `Object.is` comparison in the store keeps untouched rows from re-rendering on a single BTC tick.
- **Memoization boundaries.** `HoldingsTableRow`, `VirtualRow`, `TickerItem`, `Header`, `PriceTicker`, `CandleChart`, `OrderBook`, and `PortfolioChart` are `memo`-ized. They receive only stable props (coin metadata objects, boolean theme flag, primitive virtual positions), so re-renders are triggered by their own store subscription changing — never by a parent's tick.
- **App does not subscribe to prices.** Portfolio metrics are computed inside the single component that displays them (`SummaryCards`). The root component only re-renders when connection status or `lastUpdated` changes (a few times per connection event), rather than on every 100 ms flush.
- **100 ms WebSocket batching.** Raw ticks are buffered and merged into **one** `setState` per 100 ms. React's re-render cost is paid once per batch instead of once per message (~10–100/s).
- **Batch preserving unchanged coins.** Within a flush, `applyTickerUpdate` skips coins whose price didn't move, so the published map is a minimal delta.
- **History throttling + cap.** The portfolio chart samples at most one point every 5 s (max 240 points). The line chart does not need 20 points/sec to be smooth.
- **Imperative chart, declarative feed.** `lightweight-charts` renders to canvas with `autoSize`; the chart and series are created once and updated via `setData`/`applyOptions` effects, so pan/zoom state survives live updates and no React DOM work happens inside the chart.
- **Computation cost.** Sorting 20 rows and computing portfolio metrics are both `O(n)`/`O(n log n)` over a small fixed set; both are `useMemo`-keyed so they only re-run when the underlying data changes.

### Lighthouse

Once deployed, run a Lighthouse audit (**Performance / Accessibility / Best Practices / SEO**) and record the scores in this README. Useful knobs when tuning: the bundle is dominated by `lightweight-charts` and `recharts` (both canvas/SVG renderers), so consider code-splitting the two panels behind `React.lazy` if the Performance score drops below ~90. Re-run after each significant change.

## Testing

Jest runs against jsdom with `@swc/jest` (types stripped by SWC; react transform via the automatic runtime). Test coverage includes:

- **Pure logic** — portfolio math (value/cost/gain), SMA, formatting, sort/filter (`utils/holdingsSort.ts`), Binance message parsers (`parse*`), and the reference-preserving `applyTickerUpdate`/`upsertCandle`.
- **The market pipeline** — `marketStream.test.ts` installs a fake `WebSocket` and drives the real controller: batching before a flush publishes nothing, snapshots respect the 5 s throttle, drops trigger exponential backoff, 30 failed attempts end in `error`, and `retryNow` reconnects immediately.
- **Hooks** — `useOrderBook`'s depth parsing and connection-status transitions, and `useAlertWatcher`'s cross detection (toast fired, alert removed) via `renderHook`.
- **Components** — the holdings row renders live price / 24h change / gain-loss from store state, placeholders without a price, and flashes on its own price change; the alert dialog prefills, validates, and saves.

The virtualized scroll container and the canvas chart are intentionally not unit-tested: jsdom cannot measure layout or provide canvas/ResizeObserver, and mocking them would test the mocks. The logic they rely on lives in the extracted pure functions and parsers above.

## Scripts & Project Layout

```
src/
  components/      layout/ · summary/ · table/ · ticker/ · orderbook/ · chart/ · alerts/ · common/
  data/            coins (catalog + 20-coin portfolio set) + calibrated holdings
  hooks/           useRawStream · useOrderBook · useCandles · usePriceFlash · useTheme · useAlertWatcher
  services/        binance.ts (parsers/builders/constants) · marketStream.ts (WS controller)
  store/           marketStore.ts · alertStore.ts (persisted alerts + toasts/dialog)
  utils/           format · portfolio · indicators (SMA) · holdingsSort · alerts · notify
  types/           domain + Binance wire types
  test/            jest setup
```

---

## AI-Assisted Development: how this was built

This project was built incrementally with an AI coding agent, one feature at a time, with explicit performance reasoning at every step. The progression and the decisions each step forced:

1. **Polling → WebSocket.** Replace a 15 s REST poll with Binance's ticker stream: 15x fresher data on a single socket, at the cost of real connection state. Extracted the reconnect/backoff/stale-watchdog logic into a self-contained controller so components stay declarative.

2. **Virtualization + scale.** Jumping from ~10 coins to 130 made naive rendering impractical. Added `@tanstack/react-virtual`, deterministic generated holdings, and the critical trick of memoizing rows against stable props while merging price updates immutably so unchanged objects keep their identity.

3. **Order book.** Added a second stream type. Recognized the shared pattern (raw socket + reconnect) and extracted `useRawStream` so depth, klines, and tickers all reuse one battle-tested connection machine — no protocol-logic duplication.

4. **Candlesticks + indicators.** Introduced `lightweight-charts` and a two-source data path (REST history + live kline stream), plus a pure `computeSMA` indicator.

5. **Zustand with granular selectors.** The moment state became shared across the chart and order book, prop drilling got replaced by one store. The win condition was re-render selectivity: sub-object selectors (`prices[coin.id]`) plus reference-stable price objects mean per-tick renders are proportional to changed coins, not total coins.

6. **Jest + RTL.** The agent's test plan surfaced what couldn't be tested with jsdom (virtual scroll metrics, canvas) and drove the refactor of sort/filter into pure functions — a classic "extract for testability" outcome. A `WebSocket` mock exercises the real market pipeline end-to-end, including batching, throttling, and reconnection limits.

7. **This README.** Documenting the architecture decisions and the process itself.

8. **Data realism pass.** The 130-coin catalog had rotted (delisted/migrated pairs ⇒ permanent "no data" rows), and hash-generated buy prices produced a −92% portfolio. Scoped everything live to 20 verified liquid pairs and hand-calibrated buy prices against the live market (≈ +3.5% overall, mixed winners/losers) — verified with a throwaway script, not eyeballed.

9. **Price alerts.** Separate persisted alert store (market hot path untouched), a pure crossing predicate, a one-shot watcher, custom toaster, header management panel, and row bell indicators. The zustand "selector returns new array" infinite-loop footgun was caught by tests and fixed by selecting the stable array + filtering in render.

10. **Framer Motion.** Key-remount price pulse, spring-driven virtual-row glide (position via `animate={{ y }}` instead of CSS transform), no-remount coin-switch fade, AnimatePresence toasts/dialog/dropdown, all under `reducedMotion="user"`.

11. **Design review.** Contrast audit (ticker −500s failed AA ⇒ −700/−600), mobile divider fix in the order book, skeleton loaders everywhere, theme-flash init script, empty-state copy.

### Process notes

- **All decisions were challenged by the partner.** The agent would propose an approach (e.g., "keep polling, just accelerate it"), the partner would push on latency/cost, and the design shifted accordingly.
- **Traces of tradeoffs show in the code as comments** where a rule is intentionally relaxed (e.g., `useVirtualizer` isn't React-Compiler-memoized; rows are memoized manually instead).
- **The lint step was used as a design forcing function.** Example: the React lint warning about `setState`-in-effect for resetting candles led to the *better* design of deriving "which symbol the data belongs to" and gating displayed candles on it — no stale chart flash, no reset-in-effect.
- **Verification was continuous**: after each feature, `npm run build` + `npm run lint` (and later `npm test`) had to stay green before moving on.

### What AI assistance did NOT do

The agent never committed to git, never modified infrastructure outside the project, and made no decisions about product scope or visual design without the partner's input. Its role was implementing agreed-upon features, arguing for performance/architecture tradeoffs, and keeping the full pipeline (typecheck → lint → test → build) green at each step.