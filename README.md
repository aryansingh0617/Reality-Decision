# REALITY//DECISION

**Agentic decision-support prototype for operational uncertainty.**

REALITY//DECISION is an offline-first command-center demo that reconstructs a synthetic operational picture, surfaces cascading consequences, and produces an auditable recommendation for human authorization. It does **not** dispatch resources, predict disasters, or connect to live emergency feeds.

## The problem

During crises, evidence conflicts, dependencies fail, capacity disappears, and decision windows shrink. Conventional dashboards assume a stable world. REALITY//DECISION is built for the opposite: **partial observability under time pressure**.

## Core concept

The system runs a deterministic **information-to-action loop**:

1. Observe local evidence
2. Propagate dependency effects
3. Flag verification latency vs. decision window
4. Stress-test assumptions
5. Emit a decision packet
6. Require **human authorization** before any action is recorded

Nothing invents resources. When capacity reaches zero, the UI reports a **capacity gap** and external escalation — not a hidden truck.

## Agent architecture

Six specialized tracks (implemented as deterministic local state, not live LLM calls in this demo):

| Agent | Role |
|-------|------|
| **Evidence** | Ingests observations; detects contradictions |
| **Dependency** | Propagates graph exposure (bridge → route → depot) |
| **Verification** | Models information cost vs. decision window |
| **Decision** | Produces constrained recommendation |
| **Simulation** | Stress-tests paths under loss |
| **Orchestrator** | Sequences reasoning steps from current state |

LLMs are optional for future semantic parsing; **this deployment runs fully offline** with cached, repeatable transitions.

## Uncertainty states

The UI distinguishes operational posture on the map and in metrics: **nominal**, **uncertain**, **failed**. Evidence confidence is displayed as a synthetic percentage for demo readability — not empirical probability.

## Scenario: Assam flood-inspired synthetic exercise

The briefing panel references an **Assam flood response** exercise (“the disappearing route”). All map nodes, events, and timings are **synthetic and local**. No Assam or India live data is ingested.

### Demo flow

1. **Initiate simulation** — instantiates the corridor
2. Run five sequential scenarios: bridge collapse → satellite contradiction → verification too slow → vehicle lost → simultaneous failures
3. **Capacity zero** — confirms shortage; no fabricated capacity
4. **Trace decision** — inspect assumption chain
5. **Authorize** — human gate records approval
6. **View audit log** — append-only local trail
7. **Reset simulation** — returns to standby

## Technology stack

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Monorepo:** pnpm workspaces
- **UI:** Radix primitives, Lucide icons, Framer Motion (where used)
- **Optional scaffold:** Express API + Drizzle ORM (not required for the offline demo)

No database, authentication, or external API is required for the primary demo.

## Local setup

**Requirements:** Node.js 20+ (24 recommended), [pnpm](https://pnpm.io/) 9+

```bash
cd Replit/Autonomous-Execution-Controller   # from repository root
cp .env.example .env                        # optional; defaults are fine
pnpm install
pnpm --filter @workspace/reality-command-center run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

### Environment variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `5173` | Dev server port |
| `BASE_PATH` | No | `/` | Vite base path |
| `DATABASE_URL` | No | — | Only for optional API server |
| `OPENAI_API_KEY` | No | — | Not used in offline demo |

## Production build

```bash
pnpm install
pnpm --filter @workspace/reality-command-center run build
```

Output: `artifacts/reality-command-center/dist/public`

Preview locally:

```bash
pnpm --filter @workspace/reality-command-center run serve
```

Full workspace typecheck (includes API packages):

```bash
pnpm run typecheck
```

## Deployment (Vercel)

1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `Replit/Autonomous-Execution-Controller`.
3. Framework preset: **Vite** (or use included `vercel.json`).
4. No environment secrets required for the offline demo.
5. Deploy — static SPA with client-side routing rewrite.

## Limitations

- Deterministic React state only; no live agents or LLM in production demo path
- Sequential scenario buttons (not parallel injection)
- Synthetic confidence numbers for visualization
- API server and Postgres scaffold exist but are **not** wired to the command-center UI
- Not validated for real emergency operations or regulatory use

## Future work

- Optional LLM evidence parser with schema validation and offline fallback
- Persist audit trails via API + Postgres
- Real telemetry adapters (with explicit provenance)
- Operator usability testing with emergency-management partners

## License

MIT — see [LICENSE](./LICENSE).
