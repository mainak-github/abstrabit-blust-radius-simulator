# Agent.md — Collaborative Development & AI Assistance

This project was built through a collaborative effort. The human developer led the system design, defined the architectural plans, and implemented the application's core foundation. **Claude Code** acted as a pair programmer, assisting in implementing the database layer, coding the backend graph algorithms and simulations, and making selective frontend UI refinements according to the developer's system design.

## AI Implementation & Assistance Areas

- **Architectural Translation**: Helping structure the codebase into the layered module layout (controllers, services, graph engines) proposed in the developer's system design.
- **Database & Data Layer**: Implementing the Prisma schema, database seed scripts, and establishing the portable SQLite/PostgreSQL configuration.
- **Graph Algorithms & Simulations**: Coding the BFS blast radius propagation, DFS cycle detection logic, and Socket.IO layer-by-layer streaming services.
- **UI & Frontend Refinements**: Writing custom MUI theme utilities, styling real-time simulation updates, and improving graph node color mapping in React Flow.

## Repository structure

The project is a monorepo with two independent packages:

```
Abstrabit_SDE1_Task/
├── Architecture.md    # This file's companion
├── Agent.md           # This file
├── README.md          # How to run
├── backend/           # Node.js + Express + Prisma + Socket.IO
└── frontend/          # Next.js 15 + React 19 + MUI + React Flow
```

## Development & Collaborative Workflow

The project was developed collaboratively in defined stages:

1. **Bootstrap & Setup**: The developer established the monorepo structure, scaffolded the Express backend and Next.js frontend, and configured basic routing.
2. **Data & Schema Modeling**: Collaborated on defining the Prisma database schema (supporting 5 key models) and establishing SQLite and PostgreSQL migrations.
3. **Graph Engine (BFS & DFS)**: Implemented pure, isolated graph algorithms for blast radius calculations and cycle detection.
4. **Real-time Simulation**: Engineered the Socket.IO layer-by-layer updates streaming simulated cascades from the backend services to the client.
5. **UI & Dashboard Adjustments**: Refined MUI v9 layout elements, dark theme properties, and real-time simulation updates rendering on the frontend.
6. **Testing**: Integrated a comprehensive Vitest unit test suite covering key graph algorithms.

## Design Guidance & Directives

- **Clean Layered Architecture**: Kept a strict separation of concerns (routes -> controllers -> services -> graph engine -> Prisma client) to ensure modularity.
- **Pure Graph Operations**: Engineered the graph operations as pure, database-agnostic functions, facilitating isolation testing.
- **Real-Time Cascade UX**: Designed Socket.IO events to stream level-by-level with a configurable delay, ensuring interactive failure visualizations.
- **Cycle Detection**: Enforced DAG-structure constraint validations directly at write time.

## Notable decisions made on the fly

- **SQLite instead of PostgreSQL** because the dev environment didn't have Postgres. Prisma abstracts the dialect, so the schema and queries don't change — only `provider` and `DATABASE_URL`.
- **In-memory adjacency list** rather than recursive SQL CTEs, because the graph is small enough and pure-graph code is easier to test and reason about.
- **Longest-path layering** for the React Flow layout rather than a force simulation — deterministic, fast, and the cascade direction is visually obvious.
- **Zustand** for live simulation state rather than Redux, because the state is small and ephemeral and Zustand's hook-based API has no boilerplate.
- **Socket.IO streaming with 30 ms delay between layers** so the UI can show the cascade propagating rather than a single flash.

## Testing & Verification

The system was verified end-to-end during development:

- Backend health endpoint returns OK.
- Dashboard endpoint returns 24 services / 23 healthy / 1 degraded / 0 failed.
- Simulation of Auth Service returns CRITICAL severity with blastRadius=7, maxDepth=2, totalRiskScore=980, and 8 persisted ImpactedService rows.
- Cycle detection correctly rejects an Auth→Checkout edge with the full cycle path in the error response.
- All 5 frontend pages (dashboard, services, graph, simulation, history) compile and return 200 from Next.js dev server.
- A second simulation (Postgres) runs and appears at the top of the history list with severity CRITICAL, blast radius 12.
- **Unit test suite:** A comprehensive unit test suite has been implemented using **Vitest** inside `backend/src/graph/graph.test.ts`, covering circular dependency detection (direct and transitive), DFS cycle listing, leaf node failure propagation, central service cascading depths/paths, risk score calculations, and multi-service outage collisions. All 10 tests compile and pass successfully.

## Limitations and Deferred Scope

- **No demo video**: Producing a demo video was deferred.
- **No production hardening**: Authentication, rate limiting, and HTTPS configuration were deferred. The dev-mode CORS configuration on the backend is for local verification.
- **Single-tenant**: No multi-tenant team boundaries.

## Potential Future Extensions

- Add a `simulation:dry-run` mode that returns the same payload but does not persist—useful for "what-if" UI without polluting history.
- Add WebSocket reconnection with a "resync" call so a refreshed client catches up on a still-running simulation.
- Migrate to PostgreSQL for multi-user concurrency, and add a basic auth layer.
