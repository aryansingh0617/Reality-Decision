# REALITY//DECISION — Autonomous AI Agent Decision-Support System

**Reality//Decision** is an autonomous, API-powered, tool-using AI decision-support platform designed for emergency mission response under partial observability and high operational uncertainty.

---

## 1. Problem Statement
During critical emergencies (floods, infrastructure collapses, disaster response), reality changes rapidly: bridges fail, satellite reports contradict ground evidence, vehicle capacities drop, and decision windows shrink. Traditional static dashboards fail because they assume a stable world state.

## 2. Solution
`REALITY//DECISION` provides a closed-loop autonomous system where an AI Planning Agent continuously perceives reality shifts, executes typed tools against a deterministic engine, observes execution results, challenges its own assumptions, and formulates auditable decision packets for human authorization.

---

## 3. Autonomous Agent Architecture
The core system is orchestrated by `AutonomousPlannerAgent` which runs a multi-turn reasoning and tool-calling loop:

```text
                  REALITY DISRUPTION
                          │
                          ▼
             AutonomousPlannerAgent
                          │
                          ▼
            Google Gemini 3.5 Flash LLM
                          │
               ┌──────────┴──────────┐
               │                     │
      Model Tool Call          Final Decision
               │                     │
               ▼                     ▼
          ToolRegistry        Decision Packet
               │                     │
       ┌───────┼───────┐             ▼
       ▼       ▼       ▼     Human Authorization
     Graph    VOI   Simulation
       │       │       │
       └───────┼───────┘
               │
          Tool Result
               │
               ▼
     Model Context (Turn N+1)
```

---

## 4. Google Gemini 3.5 Flash Integration
- **Model**: `gemini-3.5-flash`
- **Capabilities**: Native function/tool declaration, structured JSON generation, multi-turn tool response processing.
- **Provider Telemetry**: Every model invocation tracks request status, model responses, and function calls with correlation IDs.

---

## 5. Dynamic Tool Calling
Rather than executing a hardcoded sequential pipeline, the LLM dynamically determines the tool sequence based on its current world belief state:
1. `inspect_reality_state`: Reads active corridor status, route capacities, and weather.
2. `query_dependency_graph`: Traverses asset dependencies to compute downstream failure cascades.
3. `simulate_counterfactual`: Evaluates parallel candidate branches across isolated world state deltas.
4. `calculate_voi`: Computes mathematical Value of Information for top uncertainties.
5. `validate_plan`: Evaluates route feasibility against physical constraints.
6. `critique_plan`: Challenges candidate plans against safety policies.
7. `escalate`: Triggers external state airlift requests when local capacity collapses.
8. `inspect_evidence`: Evaluates incoming reconnaissance reports.
9. `simulate_action`: Dispatches simulated units on authorized routes.

---

## 6. Deterministic ToolRegistry
`ToolRegistry` provides grounded, deterministic computation for graph traversal, counterfactual simulation, risk scoring, and constraint validation. The LLM acts as the decision-making controller while the `ToolRegistry` prevents mathematical hallucination.

---

## 7. Reality / State Graph
- **Corridors & Assets**: Bridges (`B-07`), Routes (`R-12`, `R-14`), Depots (`D-04`), Vehicles (`V-02`).
- **Dependency Propagation**: Automatic cascade calculations (e.g., Bridge `B-07` failure automatically invalidates Fast Corridor `R-12`).

---

## 8. Counterfactual Simulation
`SimulationAgent` stress-tests candidate branches (Direct Fast Corridor, Safe Detour Bypass, Reconnaissance Delay) across cloned world state snapshots without mutating the primary state.

---

## 9. Verification & Value of Information (VOI)
`VerificationAgent` ranks active unknowns by computing mathematical Value of Information ($VOI$) against the remaining decision window and verification latency.

---

## 10. Continuous Sentinel Monitoring
The `Continuous Sentinel` runs post-authorization to monitor reality streams. If a post-authorization disruption threatens the active plan, the Sentinel wakes the `AutonomousPlannerAgent` to initiate a replan cycle.

---

## 11. Autonomous Replanning & Reality Injection
The system supports live reality mutations via the dedicated endpoint `POST /api/mission/reality/inject`. When a disruption is injected (e.g., `B-07 = FAILED`), the agent re-investigates the graph, invalidates compromised routes, and selects an operational alternative.

---

## 12. Human Authorization Gate
AI agents generate comprehensive `DecisionPacket`s containing recommendations, risk scores, critical assumptions, counterfactual branches, and consequences if wrong. Human commanders must explicitly click `AUTHORIZE` before execution actions are logged.

---

## 13. Deterministic Safety Fallback
If the LLM provider becomes unavailable (quota limit HTTP 429, network timeout, or missing key), the system explicitly transitions to `OFFLINE_DETERMINISTIC` mode. All execution receipts are honestly tagged with `source: "DETERMINISTIC_FALLBACK"`.

---

## 14. Architecture Diagram
```text
┌─────────────────────────────────────────────────────────────┐
│                 REACT COMMAND CENTER (UI)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SSE Stream / REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FASTAPI BACKEND SERVER                   │
│                                                             │
│   MissionOrchestrator ──► AutonomousPlannerAgent           │
│                                  │                          │
│                                  ▼                          │
│                         Gemini 3.5 Flash API                │
│                                  │                          │
│                                  ▼                          │
│                             ToolRegistry                    │
│                                  │                          │
│            ┌─────────────────────┼─────────────────────┐    │
│            ▼                     ▼                     ▼    │
│    DependencyGraph         RiskEngine          Simulation   │
└─────────────────────────────────────────────────────────────┘
```

---

## 15. Local Setup Requirements
- **Python**: 3.10+
- **Node.js**: 18+
- **npm**: 9+

---

## 16. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
HOST=0.0.0.0
PORT=8000
FRONTEND_PORT=5173
```

---

## 17. How to Run

### Start Backend (FastAPI)
```bash
python app.py
```
Backend runs on `http://localhost:8000`.

### Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 18. Prototype Limitations
- Demonstrates emergency mission planning in synthetic operational scenarios.
- Map nodes and corridor telemetry are synthetic and for demonstration purposes.
- External API calls use Google Gemini 3.5 Flash for reasoning and tool invocation; offline fallback is used when API quota is exhausted.

---

## License
MIT
