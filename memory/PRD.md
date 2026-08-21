# REALITY//DECISION — Product Requirements & Progress

## Original Problem Statement
Transform the existing REALITY//DECISION app into a premium, $100M-startup-quality decision-intelligence product. **Frontend/product-experience transformation only** — no backend rewrite, reuse existing components/API contracts, minimize credit usage, maximize judge comprehension. Absolutely no git push.

## Architecture (unchanged backend)
- **Backend**: FastAPI (`app/main.py`) served via shim `backend/server.py` on :8001. Autonomous agent loop, ToolRegistry, Gemini integration (`agents/llm_client.py`, model `gemini-3.5-flash`), Sentinel, DecisionPacket, deterministic fallback. Runs in DETERMINISTIC_FALLBACK when no `GEMINI_API_KEY` (honest labeling in UI).
- **Frontend**: Vite + React 19 + TS + Tailwind v4 + framer-motion + lucide-react, served by `yarn start` (vite) on :3000. Ingress routes `/api` → :8001.
- API base resolves to `/api` in preview (see `src/api.ts`).

## Core Requirements (static)
- Story must be self-evident in 60s: REALITY → INVESTIGATE → EVALUATE → SIMULATE → VALIDATE → RECOMMEND → HUMAN REVIEW → SENTINEL → REPLAN.
- Decision-first, restrained/premium, single font, semantic color, progressive disclosure, accessible, responsive.

## Design System (new)
- Font: **Geist** (UI) + **Geist Mono** (technical/IDs/telemetry only). Palette: near-black cool slate surfaces, single signal-blue accent, muted emerald/amber/red semantics (de-neoned). Tokens + primitives in `src/index.css`; shared UI in `src/components/ui.tsx`.

## What's been implemented (2026-06)
- Global design system + typography scale + component primitives (`index.css`, `ui.tsx`, `index.html` fonts).
- Consolidated nav: **Command Center · Decision · Activity · Map · Analysis** (`App.tsx`), replacing 7 flat tabs.
- **Command Center**: current-situation strip + scenario controls (Run decision cycle / Simulate Bridge B-07 fails), `WorkflowStepper` (the story), operational map + decision panel, activity timeline, `SentinelBar`.
- **Decision-first panel** (`DecisionPacketView.tsx`): recommendation hero, Why / Evidence (verified vs uncertain) / Risk / Alternatives (from real route state) / Confidence indicator, human authorize+reject. Renders only real packet fields.
- **Activity timeline** (`AgentTrace.tsx`): plain-language steps + progressive "execution trace" (exec_id, inputs/outputs, latency, tokens).
- **Operational map** (`SpatialMapCanvas.tsx`): de-neoned, recommended route highlighted, blocked route dashed-red, live water/legend.
- **What-if simulator** (`CounterfactualFutures.tsx`): restyled to design system.
- Contextual loading states, professional error banner, empty states, keyboard focus, reduced-motion support.
- Verified end-to-end (screenshots, no console errors): run cycle streaming, authorize, nav sections, and the Bridge B-07 → R-14 replan wow moment (reality v2, map flip, recommendation switch).

## Known / Deferred
- Live Gemini mode available but user chose to keep DETERMINISTIC_FALLBACK (honest demo). Add `GEMINI_API_KEY` to `/app/.env` to enable.
- No auth in this product (no test credentials needed).

## Iteration 2 (2026-06) — all 4 next-action items delivered
- **Analysis polish**: `DependencyGraph.tsx` and `W3CProvView.tsx` fully restyled to the design system (token colors, Geist, clean chrome, metric cards). Every tab now matches.
- **Tablet layout**: `WorkflowStepper` is horizontally scrollable on narrow screens; Command Center decision panel uses responsive height (`h-[680px] lg:h-[816px]`). Verified at 1024px.
- **Replan cinematics**: `SpatialMapCanvas` uses framer-motion `pathLength` to draw the recommended route in and flashes/breaks the blocked route on B-07 failure.
- **Guided story mode**: one-tap "Play 60-second guided demo" in Command Center runs Reality→Investigate→B-07 failure→Replan→Authorize→Monitor hands-free, with a step caption banner, progress dots, and a Stop control (cancel-safe via ref). `data-testid`: auto-demo-button, stop-demo-button.
- Verified end-to-end via screenshots, zero console errors.

## Prioritized Backlog
- P2: Further ≤768px phone reflow if needed.
- P3: Optional live-mode enablement + token telemetry surfacing.

## Iteration 6 (2026-06) — replay recap card
- **RealityTimeline** now shows a "Mission recap" card when a replay completes fully (not on manual stop): summarizes each version transition (start + every reality change), flags which steps replanned the route, states how many times the plan changed, and gives the final authorization verdict. Includes "Replay again" + dismiss. `data-testid`: replay-recap, recap-replay-again, recap-dismiss. Verified, zero console errors.

## Iteration 5 (2026-06) — replay↔map sync + voice warm-up
- **Timeline replay drives the map**: `RealityTimeline` fires `onSelectVersion`/`onReplayChange`; App feeds the selected version's route to `SpatialMapCanvas` via new `replayRouteId` prop. During replay the map switches to Operational and redraws each past route with the correct bridge status (v1 = R-12/bridge passable, v2 = R-14/bridge submerged), re-animating on each step. Verified.
- **Voice warm-up**: `warmUp()` speaks a silent primer utterance on first user gesture (guided demo, timeline replay, Test voice) + 350ms settle so the first spoken line isn't clipped by cold-start.

## Iteration 4 (2026-06) — phone, autoplay, voice, interactive map
- **Phone layout**: nav is horizontally scrollable; Command Center grid collapses to single column below `lg` (1024px); header controls drop progressively (Narration always visible). Situation/metrics reflow.
- **Timeline autoplay**: `RealityTimeline` has a "Replay mission" button that auto-advances every recorded reality version and narrates each (cancel-safe via ref); appears when >1 state.
- **Voice selection**: header "Narration" popover — enable toggle, language + voice selects (from `speechSynthesis.getVoices()`), speed slider (default 0.92×), Test voice. Shared `speak()` reads settings via refs; used by both guided demo and timeline replay. (Voice list is empty in headless browsers with no TTS; populates on real browsers.)
- **Interactive network map**: `DependencyGraph` reinstated inside the Command Center via an Operational/Network segmented toggle (`data-testid="map-mode-operational|network"`). Added subtle radial depth gradient to the app shell.
- Verified: network toggle, voice popover, timeline v1→v2 replay — zero console errors.
- **Demo narration**: `runAutoDemo` speaks each step via `window.speechSynthesis` (no deps/keys); Voice on/Muted toggle in the demo banner (`data-testid="narration-toggle"`), cancel-safe via `narrateRef`.
- **Reality timeline** (`RealityTimeline.tsx`): client-side, honest record of every observed reality version (`world_state_version`) captured in an App effect. Horizontal scrubber with clickable nodes → replays that version's recommendation / route / confidence / status / cause. Rendered in Command Center above the Sentinel bar. `data-testid="timeline-v{n}"`. Verified v1→v2 replay with zero console errors.
