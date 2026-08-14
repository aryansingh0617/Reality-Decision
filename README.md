# REALITY//DECISION

### Autonomous AI Decision Intelligence for Dynamic, Uncertain Environments

> **Observe → Investigate → Simulate → Decide → Verify → Replan**

REALITY//DECISION is an **LLM-driven autonomous decision-support system** designed for situations where reality changes faster than humans can manually evaluate every dependency.

The prototype demonstrates how an AI agent can observe a changing operational environment, dynamically select tools, investigate uncertainty, simulate alternatives, generate a decision, validate it against deterministic constraints, and replan when reality invalidates the current plan.

---

## 1. The Problem

In emergency situations, information changes continuously:

* infrastructure can fail,
* routes can become unavailable,
* resources can disappear,
* reports can conflict,
* weather can change,
* and decisions become time-critical.

A conventional dashboard can **display** these changes.

REALITY//DECISION attempts to **reason over them**.

Instead of:

```text
Input → LLM → Answer
```

the system operates as:

```text
Reality
   ↓
Observe
   ↓
Investigate
   ↓
Use Tools
   ↓
Receive Results
   ↓
Reason Again
   ↓
Generate Plan
   ↓
Validate
   ↓
Replan if Required
   ↓
Human Authorization
```

---

# 2. What Makes It Agentic?

The core system uses **Gemini function calling** with a typed `ToolRegistry`.

The LLM is given a set of capabilities rather than a fixed sequence of instructions.

For example, the model may decide that it needs to:

```text
inspect_reality_state()
        ↓
inspect_evidence()
        ↓
query_dependency_graph()
        ↓
simulate_counterfactual()
        ↓
generate_decision_packet()
```

The important part is that the **next action is selected from the previous tool result**, rather than the application blindly executing a predetermined sequence.

The loop is:

```text
LLM
 ↓
Function Call
 ↓
ToolRegistry
 ↓
Tool Execution
 ↓
Structured Result
 ↓
LLM
 ↓
Next Decision
```

This creates a closed-loop agentic system rather than a single LLM response.

---

# 3. System Architecture

```text
┌─────────────────────────────────────┐
│          REACT OPERATIONS UI        │
│  Mission │ Map │ Agents │ Decision  │
│  Risks   │ Evidence │ Telemetry     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│             FASTAPI API             │
│         Mission Orchestrator        │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       AUTONOMOUS PLANNER AGENT      │
│                                     │
│   Gemini + Multi-turn Tool Calling  │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│            TOOL REGISTRY            │
├─────────────────────────────────────┤
│ Reality │ Evidence │ Graph │ VOI    │
│ Simulate│ Validate │ Critic│ Decide │
│ Escalate│ Monitor │ Execute        │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       DETERMINISTIC SAFETY LAYER    │
│  Graph Logic │ Constraints │ Checks │
└──────────────────┬──────────────────┘
                   │
                   ▼
             DECISION PACKET
                   │
                   ▼
          HUMAN AUTHORIZATION
                   │
                   ▼
          CONTINUOUS SENTINEL
                   │
                   └──────► REPLAN
```

---

# 4. Autonomous Agent Workflow

### Step 1 — Observe Reality

The agent receives the current operational state.

Example:

```text
Bridge B-07 → OPERATIONAL
Route R-12 → AVAILABLE
Route R-14 → AVAILABLE
Vehicle V-02 → AVAILABLE
Demand → 25 units
```

---

### Step 2 — Investigate

Gemini determines what information it needs and selects an available tool.

For example:

```text
inspect_reality_state
```

The actual tool executes against the backend state.

---

### Step 3 — Receive Tool Result

The result is returned directly into the next Gemini request.

Example:

```text
B-07 = FAILED
R-12 depends on B-07
```

Gemini can now change its reasoning based on the new information.

---

### Step 4 — Explore Alternatives

The agent can investigate dependencies, evidence and counterfactual scenarios.

For example:

```text
R-12 → blocked
R-14 → potentially feasible
```

The simulation layer can evaluate alternative outcomes without corrupting the primary state.

---

### Step 5 — Generate Decision

Gemini generates a structured `DecisionPacket` through a registered tool such as:

```text
generate_decision_packet(...)
```

The packet can contain:

* recommended action,
* route,
* rationale,
* confidence,
* evidence,
* risks,
* assumptions,
* alternatives,
* escalation requirements.

---

### Step 6 — Deterministic Validation

The LLM recommendation is not blindly trusted.

The deterministic layer checks:

```text
Is the route operational?

Are dependencies operational?

Is capacity sufficient?

Does the plan violate hard constraints?
```

If invalid:

```text
INVALID
   ↓
REPLAN
```

If valid:

```text
VALID
   ↓
HUMAN AUTHORIZATION
```

---

# 5. Dependency Graph Reasoning

The environment is represented as connected dependencies.

Example:

```text
B-07 Bridge
     ↓
R-12 Route
     ↓
D-04 Depot
     ↓
Medical Delivery
```

If:

```text
B-07 = FAILED
```

the system can propagate the consequence:

```text
Bridge Failure
      ↓
Route Blocked
      ↓
Depot Inaccessible
      ↓
Delivery Risk
```

This allows the system to reason about **cascading consequences**, rather than isolated events.

---

# 6. Counterfactual Simulation

The agent can evaluate alternative futures:

```text
                 CURRENT STATE
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       R-12         R-14       HOLD/VERIFY
       Fast         Detour       Wait
          │           │           │
          └───────────┼───────────┘
                      ▼
                 Compare Plans
```

Possible factors include:

* travel time,
* capacity,
* infrastructure dependencies,
* risk,
* uncertainty,
* mission feasibility.

---

# 7. Value of Information

Not every unknown deserves investigation.

The Verification layer evaluates the value of obtaining additional information based on factors such as:

```text
Impact
×
Uncertainty
÷
Verification Cost
```

This lets the agent prioritize information that could materially change the decision.

---

# 8. Continuous Sentinel

The system does not have to stop after generating a plan.

After authorization:

```text
AUTHORIZED PLAN
      ↓
CONTINUOUS MONITORING
      ↓
REALITY CHANGES
      ↓
PLAN INVALIDATED?
      │
   ┌──┴──┐
   NO    YES
   │      │
MONITOR  REACTIVATE AGENT
              ↓
            REPLAN
```

This creates a persistent decision loop.

---

# 9. Human-in-the-Loop Safety

The system is autonomous in **investigation, reasoning, simulation and replanning**, but the prototype intentionally keeps final authorization with a human.

```text
AI Investigation
       ↓
AI Reasoning
       ↓
AI Decision
       ↓
Deterministic Validation
       ↓
HUMAN AUTHORIZATION
```

This prevents the prototype from presenting itself as an unrestricted autonomous command system.

---

# 10. Tool Registry

The `ToolRegistry` provides controlled capabilities to the LLM.

Representative tools include:

| Tool                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `inspect_reality_state`    | Inspect current world state        |
| `inspect_evidence`         | Investigate available evidence     |
| `query_dependency_graph`   | Trace infrastructure dependencies  |
| `simulate_counterfactual`  | Test alternative futures           |
| `calculate_voi`            | Prioritize valuable information    |
| `validate_plan`            | Apply deterministic constraints    |
| `critique_plan`            | Challenge candidate decisions      |
| `escalate`                 | Handle insufficient local capacity |
| `generate_decision_packet` | Produce structured final decision  |

Every execution can generate an auditable execution record.

---

# 11. Execution Telemetry

The system records the autonomous execution chain.

Example:

```text
LLM_REQUEST
     ↓
LLM_RESPONSE
     ↓
TOOL_CALL
     ↓
TOOL_RESULT_RETURNED_TO_LLM
     ↓
LLM_REQUEST
     ↓
LLM_RESPONSE
     ↓
NEXT TOOL CALL
     ↓
FINAL_PLAN
```

This makes the agent's behavior observable instead of hiding the reasoning process behind a single API response.

---

# 12. Deterministic Fallback

LLM providers can experience:

* quota exhaustion,
* HTTP 429 errors,
* network failures,
* timeouts,
* unavailable credentials.

The prototype therefore supports:

```text
LLM_AGENTIC
     │
     ├── Success → Continue agentic loop
     │
     └── Failure → OFFLINE_DETERMINISTIC
```

Fallback execution is explicitly marked as deterministic rather than falsely presented as LLM reasoning.

---

# 13. Technology Stack

### Frontend

* React
* Vite
* Framer Motion
* Operational dashboard

### Backend

* Python
* FastAPI
* Uvicorn

### AI

* Google Gemini
* Function calling
* Multi-turn tool interaction

### Agent Infrastructure

* Autonomous Planner Agent
* Tool Registry
* Execution Records
* Continuous Sentinel
* Replanning

### Decision Intelligence

* Dependency graphs
* Counterfactual simulation
* VOI analysis
* Evidence reasoning
* Deterministic validation

---

# 14. Project Structure

```text
Reality-Decision-Prototype/
│
├── agents/
│   ├── autonomous_agent.py
│   ├── llm_client.py
│   ├── decision_agent.py
│   ├── critic_agent.py
│   └── simulation_agent.py
│
├── core/
│   ├── tools/
│   │   └── tool_registry.py
│   ├── state/
│   │   └── reality_state.py
│   ├── dependencies/
│   └── evidence/
│
├── frontend/
│   └── src/
│
├── app.py
├── requirements.txt
├── .env.example
└── README.md
```

---

# 15. Setup

### Clone

```bash
git clone https://github.com/aryansingh0617/Reality-Decision-Prototype.git
cd Reality-Decision-Prototype
```

### Backend

```bash
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install:

```bash
pip install -r requirements.txt
```

### Environment

Create `.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

**Never commit your API key.**

### Run Backend

```bash
python app.py
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:8000
```

---

# 16. Important Endpoints

```text
GET  /api/health
GET  /api/state
GET  /api/agent/execution
GET  /api/mission/autonomous/stream
POST /api/mission/reality/inject
```

---

# 17. Example Demonstration

Initial state:

```text
B-07 Bridge → OPERATIONAL
R-12 → AVAILABLE
R-14 → AVAILABLE
```

Inject:

```text
B-07 → FAILED
```

The system can then:

```text
Detect change
     ↓
Inspect reality
     ↓
Investigate dependencies
     ↓
Determine R-12 is affected
     ↓
Explore alternatives
     ↓
Simulate R-14
     ↓
Generate decision
     ↓
Validate decision
     ↓
Request human authorization
```

If the environment changes again, the Sentinel can reactivate the agent and initiate another planning cycle.

---

# 18. Prototype Scope

REALITY//DECISION is a **hackathon/research prototype**.

The current environment and operational actions are simulated.

It is not connected to real emergency infrastructure and should not be used for real-world emergency command.

A production system would require:

* authenticated real-time data sources,
* hardened security,
* formal safety policies,
* distributed state management,
* domain validation,
* robust observability,
* human governance,
* and extensive testing.

---

# 19. Why It Matters

REALITY//DECISION explores a shift from:

> **AI that answers questions**

to:

> **AI that investigates changing reality, uses tools, evaluates consequences, makes decisions, verifies them, and adapts when the world changes.**

The long-term vision is a decision-intelligence layer capable of helping humans operate in environments where:

**uncertainty + changing state + cascading dependencies + time pressure**

make traditional static decision systems insufficient.

---

## Core Architecture

```text
          REALITY
             ↓
          OBSERVE
             ↓
          GEMINI
             ↓
       SELECT TOOL
             ↓
       TOOL REGISTRY
             ↓
     REAL SYSTEM STATE
             ↓
       TOOL RESULT
             ↓
          GEMINI
             ↓
       REASON AGAIN
             ↓
       DECISION PACKET
             ↓
   DETERMINISTIC VALIDATION
          ↙       ↘
       VALID      INVALID
         ↓           ↓
      HUMAN       REPLAN
      GATE           │
         ↓           │
      SENTINEL ←─────┘
         │
         └──────► CHANGING REALITY
```

### **REALITY//DECISION**

**An autonomous decision loop for a world that refuses to stay still.**
