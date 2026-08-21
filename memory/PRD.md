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
- `DependencyGraph` (reactflow) and `W3CProvView` kept in original technical style (legitimately technical views under Analysis) to save credits.
- No auth in this product (no test credentials needed).

## Prioritized Backlog (P0 done)
- P1: Restyle Dependency graph + W3C Provenance to match design tokens.
- P2: Tablet/≤1024px reflow polish for Command Center two-column grid.
- P3: Optional live-mode enablement + token telemetry surfacing.
