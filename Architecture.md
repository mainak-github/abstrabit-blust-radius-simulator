# Dependency Blast Radius Simulator — Architecture

## 1. Overview

The **Dependency Blast Radius Simulator** helps engineering teams reason about cascading failures in a distributed system. Engineers model services and the dependencies between them, then simulate the failure of one or more services to see what breaks, how deep the impact goes, and how severe the blast radius is.

The system is a small two-tier web application:

- A **Node.js + Express + TypeScript** backend that owns the data model, the graph algorithms (BFS, cycle detection, severity scoring), and a WebSocket channel for streaming simulation results.
- A **Next.js 15 + React 19** frontend that lets users author the dependency graph, visualize it, run simulations, and review history.

PostgreSQL was the design target, but the system is built on **Prisma ORM** with **SQLite** for portability — flipping the `provider` line in `prisma/schema.prisma` and updating `DATABASE_URL` is the only change required to switch databases.

---

## 2. High-Level Architecture

```
┌────────────────────────────────┐         ┌──────────────────────────────────┐
│   Browser (Next.js 15 SPA)     │         │   Node.js / Express 5 API       │
│                                │         │                                  │
│  ┌──────────────────────────┐  │  REST   │  ┌────────────────────────────┐  │
│  │  Pages                   │  │ ◀────▶  │  │  Controllers (HTTP layer)  │  │
│  │  - /dashboard            │  │         │  └──────────┬─────────────────┘  │
│  │  - /services             │  │         │             ▼                    │
│  │  - /graph (React Flow)   │  │  WS     │  ┌────────────────────────────┐  │
│  │  - /simulation (Live)    │  │ ◀────▶  │  │  Services (domain logic)   │  │
│  │  - /history (Compare A/B)│  │         │  │  + Graph Engine (BFS/DFS)  │  │
│  └──────────────────────────┘  │         │  └──────────┬─────────────────┘  │
│            ▲                   │         │             ▼                    │
│  ┌──────────────────────────┐  │         │  ┌────────────────────────────┐  │
│  │  Zustand store           │  │         │  │  Prisma Client             │  │
│  │  SWR data fetching       │  │         │  └──────────┬─────────────────┘  │
│  └──────────────────────────┘  │         │             ▼                    │
│                                │         │  ┌────────────────────────────┐  │
│  Socket.IO client ─────────────┼─────────┼─▶│  Socket.IO server          │  │
└────────────────────────────────┘         │  └────────────────────────────┘  │
                                            │             ▼                    │
                                            │       SQLite (dev.db)            │
                                            └──────────────────────────────────┘
```

**Request lifecycle** for a simulation:

1. User selects failed services on `/simulation` and clicks **Simulate**.
2. Frontend POSTs to `/api/simulations` and simultaneously subscribes to Socket.IO events for that simulation id.
3. Backend service layer builds an adjacency list from the DB, runs BFS for blast radius, and starts streaming layer-by-layer updates.
4. Frontend renders impacts as they arrive, with a fade-in animation, and React Flow on `/graph` lights up affected edges.
5. When the simulation completes, the backend persists the result and sends a final summary event; the frontend lands on its final impact view.

---

## 3. Backend Design

### 3.1 Module layout

```
backend/
├── prisma/
│   ├── schema.prisma        # 5 models: Service, Dependency, Simulation, SimulationFailure, ImpactedService
│   ├── seed.ts              # Seeds 24 services + 29 dependencies
│   └── dev.db               # SQLite database
└── src/
    ├── app.ts               # Express app factory (middleware, routes, error handler)
    ├── server.ts            # HTTP server + Socket.IO init on port 4000
    ├── config/prisma.ts     # PrismaClient singleton
    ├── types/index.ts       # Shared TS types (Criticality, Severity, ServiceNode, ...)
    ├── graph/
    │   ├── graph.builder.ts     # Adjacency list (upstream + downstream) from DB
    │   ├── blast.radius.ts      # BFS + classification + risk scoring
    │   └── cycle.detector.ts    # wouldCreateCycle() + findAllCycles()
    ├── services/                # Domain layer
    │   ├── service.service.ts
    │   ├── dependency.service.ts
    │   ├── simulation.service.ts
    │   └── dashboard.service.ts
    ├── controllers/             # Thin HTTP adapters
    ├── routes/index.ts          # All REST endpoints mounted under /api
    ├── middlewares/errorHandler.ts
    └── socket/io.ts             # Socket.IO init + getIO() accessor
```

**Layering:** routes → controllers → services → graph engine → Prisma. The controllers do nothing except shape input and call services. The graph engine has zero DB knowledge — it operates on in-memory adjacency lists so it stays pure and testable.

### 3.2 Data model

Five Prisma models, all related to a `Service` row:

| Model                | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `Service`            | The service itself: name, owner, status, criticality, desc. |
| `Dependency`         | A directed edge: `service → dependsOnService`.              |
| `Simulation`         | A simulation run: name, severity, blast radius, risk score. |
| `SimulationFailure`  | The set of services that "failed" in a simulation.          |
| `ImpactedService`    | A single service impacted by the simulation, with depth + path. |

Indexes on `Dependency(serviceId, dependsOnServiceId)` keep adjacency-list rebuilds fast.

### 3.3 Graph engine

The graph engine is the heart of the system. It is **in-memory and stateless**: it reads the current dependency graph from the DB, builds two `Map<string, string[]>` adjacency lists — `upstream` (X → things that depend on X) and `downstream` (X → things X depends on) — and runs algorithms on those.

- **Blast radius** (`blast.radius.ts`): a BFS from each failed service over the `upstream` map. Every visited node gets a `depth` (the hop count from any failed service) and a `path` (the actual chain). The visited set prevents double-counting a service impacted by two failures.
- **Impact classification**: a service is `FAILED` if it is one of the seeded failures, `DEGRADED` if the chain includes a critical hop, or `AT_RISK` if only non-critical hops are between it and the failure. This mirrors how a real incident triage board would label things.
- **Severity scoring**: a numeric risk score is computed as

  ```
  risk(node) = CRITICALITY_WEIGHT[criticality] × depthWeight(depth) × 5
  ```

  The total risk score is the sum across all impacted nodes. It is then bucketed into `LOW / MEDIUM / HIGH / CRITICAL` at thresholds 40 / 100 / 200, which match the visual palette used in the UI.
- **Cycle detection** (`cycle.detector.ts`): a DFS that walks downstream from the proposed new edge; if it reaches the source service, a cycle exists and the create-call is rejected with the full cycle path so the user can see exactly what they tried to do.

The simulation service streams results back to the client one BFS layer at a time with a small delay (`setTimeout` 30 ms) so the UI can render the cascade progressively rather than all at once.

### 3.4 REST API

All endpoints are mounted under `/api`. Selected surface:

| Method | Path                                  | Purpose                                |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/health`                             | Liveness probe.                        |
| GET    | `/api/services`                       | List services (search, filter).        |
| POST   | `/api/services`                       | Create a service.                      |
| PATCH  | `/api/services/:id`                   | Update a service.                      |
| DELETE | `/api/services/:id`                   | Delete service + cascade dependencies. |
| GET    | `/api/dependencies`                   | List all edges.                        |
| POST   | `/api/dependencies`                   | Create edge (rejects cycles).          |
| DELETE | `/api/dependencies/:id`               | Remove edge.                           |
| GET    | `/api/simulations`                    | List past simulations.                 |
| GET    | `/api/simulations/:id`                | Full detail incl. impacted list.       |
| POST   | `/api/simulations`                    | Run a simulation (streams via WS).     |
| GET    | `/api/dashboard`                      | Overview cards + criticality dist.     |
| GET    | `/api/dashboard/graph`                | Full graph for the React Flow view.    |
| GET    | `/api/dashboard/top-dependencies`     | Highest-fan-in services.               |
| GET    | `/api/dashboard/recent-simulations`   | Last 5 simulations.                    |
| GET    | `/api/dashboard/resilience`           | Resilience score 0–100.                |

Error handling is centralized in `middlewares/errorHandler.ts`. It maps Prisma error codes (`P2002` for unique violation, `P2025` for not-found) to HTTP status codes, and re-throws cycle errors with their `cyclePath` so the frontend can display them.

### 3.5 Socket updates & Toast Notifications

Socket.IO is initialized in `socket/io.ts` and attached to the same HTTP server as Express. The simulation service emits three events to the originating socket:

- `simulation:start` — `{ simulationId, failedServiceIds }`
- `simulation:update` — `{ serviceId, serviceName, depth, status, path }` (one per impacted node, layered)
- `simulation:end` — `{ simulationId, severity, blastRadius, totalRiskScore }`

The frontend client intercepts these events to drive both localized visual cascades and global notifications:
1. **Live State**: Persisted in a Zustand store keyed by service id, allowing color highlights on the `/graph` view and stream-in list updates on `/simulation`.
2. **Global Toast System**: A queue-based notification store (`useNotificationStore`) intercepts `simulation:start` and `simulation:end` events and pushes toast alerts globally. A root `<GlobalToasts />` component renders MUI `Snackbar` overlays, showing starting drills and drill completions (color-coded by severity) across all pages.

---

## 4. Frontend Design

### 4.1 Module layout

```
frontend/src/
├── app/
│   ├── layout.tsx             # Root layout (Sidebar + content)
│   ├── page.tsx               # Redirect → /dashboard
│   ├── dashboard/page.tsx     # Health overview + recent sims
│   ├── services/page.tsx      # Service grid + CRUD + dependency editor
│   ├── graph/page.tsx         # React Flow topology
│   ├── simulation/page.tsx    # Live simulation runner
│   └── history/page.tsx       # History list + A/B compare
├── components/
│   └── layout/{Providers,Sidebar,TopBar}.tsx
├── hooks/
│   └── useSimulationSocket.ts # Subscribes to simulation:* events
├── lib/
│   ├── api.ts                 # Typed REST client
│   ├── fetcher.ts             # SWR fetcher
│   └── theme.ts               # Dark MUI theme + color maps
├── store/
│   └── simulationStore.ts     # Zustand: live simulation state
└── types/index.ts             # Mirrors backend types
```

### 4.2 State management

- **SWR** is used everywhere a page needs to read data. Pages pass a key (the API URL) and get `{ data, mutate }`. Mutations (create/update/delete) call SWR's `mutate()` to revalidate the cache. The history page and graph page also use `refreshInterval` to poll for changes.
- **Zustand** holds *live, ephemeral* simulation state — the set of currently-failed services, the running impact map, and the final result. This state is intentionally not in SWR because it is driven by WebSocket events, not REST.
- The simulation page and the graph page both subscribe to the same store, so a click on **Simulate** lights up nodes and edges on the graph without any cross-page messaging.

### 4.3 Graph layout

React Flow is used for the topology view. The graph is laid out with a simple deterministic algorithm rather than a force layout: services are grouped into layers by **longest-path layering** (a service is on layer N+1 if any service that depends on it is on layer N), then spaced evenly within each layer. This makes the cascade direction obvious — sinks at the bottom, top-of-funnel services at the top — and is stable across re-renders. Edges are animated when their source is failed or impacted; the MiniMap is colored by criticality.

### 4.4 Service management

The services page is a grid of cards with search + status + criticality filters. Each card has Edit, Delete, and a **Manage** button that opens a dependency editor dialog — it shows the service's existing dependencies and "used-by" dependents in two sections, and lets the user add new dependencies. Cycle violations come back as a 4xx with `cyclePath`, and the snackbar displays the path so the user understands why the dependency was rejected.

### 4.5 Simulation runner

The simulation page is split into a service selector (left) and an impact panel (right). The user picks one or more services to fail, optionally names the simulation, and clicks **Simulate**. The page subscribes to the WS channel for that simulation id, and each impact arrives in a card that fades in with the `STATUS_COLOR` border. A summary bar (severity / blast radius / risk) is shown above the impact list, and is filled in as the WS events arrive.

### 4.6 History & comparison

The history page lists all past simulations, with severity chips and key metrics. Each row has **A** / **B** buttons; clicking them sets a comparison state, and a side-by-side comparison panel appears at the top of the page. A **Details** button opens a full dialog with the impacted service list, paths, and depth.

---

## 5. Key Design Decisions

| Decision | Rationale |
| --- | --- |
| **Prisma + SQLite** for dev, with a one-line switch to PostgreSQL | PostgreSQL was the design target but the dev environment lacked it. Prisma abstracts the dialect, so the only changes to switch are `provider = "postgresql"` and `DATABASE_URL`. Schema and queries stay identical. |
| **In-memory graph engine** (not a recursive DB CTE) | The graph is small enough to load into memory for every simulation, and pure-graph operations are easier to test and reason about. |
| **WebSocket streaming** for simulations, REST for everything else | Most actions (CRUD, history read) are request/response and don't benefit from a persistent connection. Simulations are the one thing where watching the cascade happen is the whole point. |
| **Zustand over Redux** for live state | The simulation store is small and ephemeral — Zustand gives us a one-line hook with no boilerplate, and the store survives navigation so the graph page can light up while the user is on the simulation page. |
| **Longest-path layering** for graph layout | Deterministic, fast, no physics simulation needed. The cascade direction is visually obvious (sinks at the bottom). |
| **Severity threshold of 40 / 100 / 200** | Calibrated against the seeded dataset: a single CRITICAL failure produces ~150–200 risk points; a small LOW failure stays under 40. This makes the badges meaningful rather than everything being CRITICAL. |
| **Cycle detection at write time, not read time** | Cycles break blast-radius reasoning. Rejecting them at the dependency-create call is cheaper and clearer than handling them at simulation time. |
| **BFS over upstream map** for blast radius | Upstream = "things that depend on me". When I fail, my blast radius is the set of upstream services. BFS gives depth and shortest path naturally. |

---

## 6. Scalability

The current implementation is sized for a single team managing dozens to low hundreds of services. The bottlenecks and their mitigations:

- **Graph rebuild on every simulation.** The full adjacency list is rebuilt from the DB on each `POST /api/simulations`. For ~500 services this is still sub-100 ms. If it became a bottleneck, the fix is to cache the adjacency list in memory and invalidate on write.
- **WebSocket fan-out.** Each simulation pushes events to one socket. For 10+ concurrent simulations you'd want to use Socket.IO rooms (one room per simulation id) so listeners only get events for the simulations they care about.
- **Database.** SQLite is fine for dev and small teams. PostgreSQL is the natural next step — the schema is already PostgreSQL-compatible.
- **Frontend polling.** Dashboard and history use 10–15 s SWR poll intervals. For higher freshness, switch the dashboard to WebSocket-driven updates and the history page to cursor-based pagination.

---

## 7. Failure Handling

- **Invalid input.** Controllers validate types and let the service layer throw domain errors. The error handler maps domain errors to 400, 404, 409 as appropriate.
- **Cycle creation.** A `CycleError` thrown by `cycle.detector.ts` is caught in the dependency controller and returned as 409 with `{ error: "CYCLE", cyclePath: [...] }` so the UI can render the exact path.
- **Prisma unique violations.** Caught in the error handler and returned as 409.
- **WebSocket disconnect.** Socket.IO auto-reconnects. The simulation store resets on disconnect so the UI doesn't stay in a stale "running" state.
- **Database errors.** Logged with a request id and returned as 500 with a stable error code. The frontend surfaces a snackbar with the message.
- **Frontend compile errors.** Next.js dev server shows a red overlay. Production builds fail loudly.

---

## 8. Future Work

Things explicitly out of scope for this iteration that would be natural next steps:

- **Time-windowed simulation** (failure at T=0, recovery at T=N).
- **Probabilistic failure** (each dependency has a P(fail) and the simulator runs Monte Carlo).
- **SLO/breach-cost modeling** — attach an availability target per service and compute a dollar or user-impact cost.
- **Import from infra** — read services + dependencies from Kubernetes, AWS, or Backstage.
- **Per-team access control** for multi-tenant use.
- **Graph diff** over time, so you can see when a dependency was added.
