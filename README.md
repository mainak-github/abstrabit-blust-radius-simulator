# Dependency Blast Radius Simulator — Technical Report & Documentation

An enterprise-grade system modeling tool that allows engineering teams to construct a live dependency graph of their services, run real-time failure simulations, automatically calculate cascading failure blast radiuses, analyze risk scores, and check for dependency cycles.

---

## 1. Problem Definition & Core Challenge

### The Microservice Failure Cascade Problem
In modern distributed architectures, applications are composed of dozens or hundreds of decoupled microservices. While microservices offer benefits like independent scaling and deployment, they introduce complex runtime dependencies. If Service A relies on Service B, and Service B relies on Service C, a degradation or outage in Service C can propagate upstream, causing a cascade of failures that ultimately impacts user-facing entry points (like API Gateways or Frontends).

Tracking these dependencies manually is nearly impossible in fast-moving engineering organizations. Standard incident response is reactive—teams only learn about a cascade when an outage is already in progress.

### The Objective
The **Dependency Blast Radius Simulator** solves this by providing a proactive modeling tool to:
1. **Map out services** and their exact runtime dependencies.
2. **Prevent circular dependencies** at design/creation time, as cycles create feedback loops that make failure recovery chaotic and hard to reason about.
3. **Simulate failure scenarios** in real-time, visualizing exactly how a localized failure (e.g., a database connection pool exhaustion) cascades through the system.
4. **Quantify the impact** using a structured, weight-based risk-scoring framework to identify high-risk nodes (e.g., single points of failure with massive fan-ins).
5. **Compare historical simulations** side-by-side to track how architectural changes improve or degrade system resilience over time.

---

## 2. System Architecture & Design Choices

The system is designed as a modular, two-tier web application, focusing on high cohesive layering, separation of concerns, and clean data contracts.

```
┌──────────────────────────────────────────┐         ┌───────────────────────────────────────────────────┐
│         Browser (Next.js 15 App)         │         │               Node.js / Express 5 API             │
│                                          │         │                                                   │
│  ┌────────────────────────────────────┐  │  REST   │  ┌─────────────────────────────────────────────┐  │
│  │ Pages & UI Layout                  │  │ ◀─────▶ │  │ Controllers (HTTP Adaptors)                 │  │
│  │ - /dashboard (Health & Metrics)    │  │         │  └──────────────────────┬──────────────────────┘  │
│  │ - /services (CRUD & Dependency Ed.)│  │         │                         ▼                         │
│  │ - /graph (React Flow Topology View)│  │  WS     │  ┌─────────────────────────────────────────────┐  │
│  │ - /simulation (Live Action Panel)  │  │ ◀─────▶ │  │ Services (Domain Logic & Orchestration)     │  │
│  │ - /history (Replay & A/B Compare)  │  │         │  └──────────────────────┬──────────────────────┘  │
│  └────────────────────────────────────┘  │         │                         ▼                         │
│                     ▲                    │         │  ┌─────────────────────────────────────────────┐  │
│  ┌────────────────────────────────────┐  │         │  │ Graph Engine (Pure BFS / DFS Algorithms)     │  │
│  │ Client-Side State:                 │  │         │  └──────────────────────┬──────────────────────┘  │
│  │ - SWR (HTTP Caching / Polling)     │  │         │                         ▼                         │
│  │ - Zustand (WS Live Simulation Store)│  │         │  ┌─────────────────────────────────────────────┐  │
│  └────────────────────────────────────┘  │         │  │ Data Layer (Prisma ORM Client)              │  │
│                                          │         │  └──────────────────────┬──────────────────────┘  │
│                                          │         │                         ▼                         │
│                                          │         │               Database (SQLite / Postgres)        │
└──────────────────────────────────────────┘         └───────────────────────────────────────────────────┘
```

### Layered Architecture & Code Separation
The project maintains a strict separation of concerns, dividing the codebase into logical layers:
*   **Routing & Middleware**: Manages HTTP request endpoints, validates payloads using Zod schemas, and intercepts errors globally via a centralized error handler (`errorHandler.ts`).
*   **Controllers**: Converts HTTP requests into clean service inputs, calls the appropriate service, and shapes the output back to the client.
*   **Services**: Orchestrates business logic, interacts with the Prisma database client, and manages Socket.IO emissions.
*   **Graph Engine**: Contains pure, database-agnostic algorithms for graph traversal, cycle detection, and risk scoring. It accepts in-memory structures and returns computed results, making the core math highly testable and decoupled from the database.

---

## 3. Database Choice & Portability (SQLite vs. PostgreSQL)

### Why Prisma ORM + SQLite is Used in Development
*   **Zero-Dependency Setup**: SQLite stores the entire database in a single local file (`dev.db`). This allows other developers, evaluators, or CI environments to run the project instantly using `npm install && npm run prisma:migrate` without installing and configuring a standalone PostgreSQL server.
*   **Database Portability**: By using **Prisma ORM**, database operations are abstracted away from database-specific SQL dialects. The database schema is defined using Prisma's declarative schema syntax.

### Seamless PostgreSQL Integration (For Production)
The system is built to switch to a production-grade **PostgreSQL** database with a simple configuration change. No application code needs to be modified.

To switch the database to PostgreSQL:
1.  Open `backend/prisma/schema.prisma` and edit the `datasource` block:
    ```prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
2.  Update the connection string in `backend/.env`:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/blast_radius"
    ```
3.  Re-generate the client and apply the migrations:
    ```bash
    cd backend
    npm run prisma:migrate
    npm run seed
    ```

### Why This Database Approach is the Best Choice
This hybrid strategy combines the speed of local developer workflows with enterprise-grade production capability. Prisma serves as an abstraction layer that ensures:
1.  **Type Safety**: The database client generates TypeScript interfaces matching the schema, eliminating runtime query errors.
2.  **Safety & Migrations**: Prisma Migrations track schema updates in version control, making database schema drift easy to prevent.
3.  **Relational Integrity**: Foreign key constraints, cascading deletions (e.g., deleting a service automatically deletes its dependencies and historical simulation logs), and unique indexes are enforced database-side.

---

## 4. Graph Engine & Algorithm Design

The graph engine is designed to be **stateless and pure**. It builds an in-memory representation of the graph on demand, avoiding recursive database queries (like SQL CTEs) which can be slow, complex, and dialect-specific.

### Adjacency List Structure
The engine reads services and edges from the database and builds an `AdjacencyList` structure containing:
*   `nodes`: A map of service IDs to their attributes (name, criticality, status).
*   `downstream`: A map of service IDs to the IDs of services they depend on (`X -> [Y]` means X depends on Y).
*   `upstream`: A map of service IDs to the IDs of services that depend on them (`Y -> [X]` means X is depended on by X; i.e., failure propagates along this path).

---

### A. Blast Radius Propagation (BFS)
When a service fails, the failure cascades **upstream** (to services that depend on it). The engine uses **Breadth-First Search (BFS)** starting from the set of failed services, propagating along the `upstream` adjacency list.

```
                  ┌──────────────────────┐
                  │ API Gateway (Depth 2)│
                  └──────────▲───────────┘
                             │
                             │ (depends on)
                             │
                   ┌───────────────────┐
                   │ Auth Service (D1) │
                   └─────────▲─────────┘
                             │
                             │ (depends on)
                             │
                  ┌──────────────────────┐
                  │ Postgres (D0, FAIL!) │
                  └──────────────────────┘
```

#### Why BFS is the Best Approach for Blast Radius
1.  **Shortest Impact Path**: If a service depends on a failed component through multiple paths, BFS guarantees we discover it via the shortest (fewest hops) path, which is where the direct failure cascade usually travels.
2.  **Layer-by-Layer Evaluation**: BFS naturally groups impacted services by their distance (depth) from the source failure, which allows the system to stream updates level-by-level.
3.  **Visitations Guard**: We maintain a `visited` set to ensure no service is evaluated twice, preventing infinite loops in the presence of complex topologies and keeping traversal complexity optimal at **$O(V + E)$**.

---

### B. Cycle Detection (DFS)
Circular dependencies (e.g., A depends on B, B depends on C, and C depends on A) are dangerous because they create feedback loops that make failure recovery difficult. The simulator prevents cycles at **write time** (when a dependency is created).

#### Cycle Detection DFS Algorithm
When a user attempts to add an edge `serviceId -> dependsOnServiceId` (Service A depends on Service B):
1.  The engine performs a **Depth-First Search (DFS)** starting from `dependsOnServiceId` (Service B) walking along the `downstream` dependency map.
2.  If the search reaches `serviceId` (Service A), a path exists from B back to A. Adding the edge would close a loop.
3.  The request is rejected with a `409 Conflict`, returning the full cycle path (e.g., `[A, B, C, A]`) so the frontend can display it visually.

---

### C. Severity & Resilience Scoring Models

#### 1. Impact Classification Model
An impacted service's status is classified based on its depth and its declared criticality:
*   **FAILED**: The initial failed services (Depth 0).
*   **DEGRADED**: Any service at Depth 1 (directly depending on a failed node), or any service of `CRITICAL` criticality at deeper layers (Depth $\ge$ 2), because critical services are highly sensitive.
*   **AT_RISK**: Services at Depth $\ge$ 2 that have a criticality of `HIGH`, `MEDIUM`, or `LOW`.

#### 2. Risk Scoring Formula
The total risk score for a simulation is the sum of the risk contributions of all downstream impacted nodes:
$$\text{Risk}(n) = \text{CriticalityWeight}[criticality] \times \text{DepthWeight}(depth) \times 5$$

Where:
*   **Criticality Weights**: `LOW = 1`, `MEDIUM = 2`, `HIGH = 4`, `CRITICAL = 8`
*   **Depth Weight**: $\max(1, 6 - depth)$ (Front-loads risk: a direct hop failure is weighted far higher than a 5-hop cascade).

#### 3. Simulation Severity Categorization
The final severity badge for a simulation is determined by the total risk score or the absolute count of affected services (whichever is higher):
*   **CRITICAL**: Risk Score $\ge 200$ OR Affected Services $\ge 8$
*   **HIGH**: Risk Score $\ge 100$ OR Affected Services $\ge 5$
*   **MEDIUM**: Risk Score $\ge 40$ OR Affected Services $\ge 2$
*   **LOW**: Risk Score $< 40$ and Affected Services $< 2$

#### 4. Dashboard Resilience Score
A holistic metric ($0 - 100$) reflecting the current structural robustness of the entire microservice graph. It is computed as:
$$\text{Resilience} = 100 - (\text{Criticality Penalty} + \text{Centrality Penalty} + \text{Historical Failure Penalty})$$

*   **Criticality Penalty**: Deducts points for having a high proportion of high-criticality services.
*   **Centrality Penalty**: Identifies "hot-spots" (nodes with extremely high fan-in, such as key databases or identity providers) and penalizes if they are degraded or lack fallback edges.
*   **Historical Failure Penalty**: Deducts points based on the severity of recent simulations recorded in history.

---

## 5. Implementation Details & Tech Stack

### Backend Stack
*   **Node.js & Express 5**: Modern, fast HTTP server handling REST endpoints.
*   **Prisma 6 & SQLite**: Type-safe relational database management.
*   **Socket.IO 4**: Bi-directional event communication.
*   **Zod**: Runtime payload validation for all API inputs.
*   **Vitest**: Fast, parallel unit testing framework.

### Frontend Stack
*   **Next.js 15 (App Router) & React 19**: Modern React framework leveraging layout architectures.
*   **React Flow 11**: Customizable interactive node-based graph rendering library.
*   **Zustand**: Clean, hook-based, atomic global state manager used to coordinate the live simulation state between pages.
*   **SWR**: Stale-While-Revalidate caching client to handle page-level HTTP data polling and caching.
*   **Material UI (MUI) 9**: Modern Component Library customized with a dark theme.

### Deterministic Layered Graph Layout
Instead of using chaotic force-directed physics simulations (which jump around on re-renders), the React Flow graph uses a **longest-path layering layout algorithm**:
1.  Each node is assigned to a layer $L$: a service is on layer $N+1$ if its deepest downstream dependency is on layer $N$.
2.  Sinks (databases, external third-party APIs) naturally settle at the bottom.
3.  Entry points (frontend, API Gateway) sit at the top.
4.  Nodes are distributed horizontally within their layers to prevent overlapping edges.
This produces a clean, readable layout where the failure cascade always propagates from the bottom to the top.

---

## 6. Live Simulation Streaming Flow

To create a realistic incident cascade, the simulation doesn't return in a single batch. Instead, the backend streams the failure cascade over Socket.IO:

```
1. Client POSTs to /api/simulations 
   └─► Backend generates Simulation UUID 
       └─► Emits "simulation:start" (UUID, Failures)
           └─► Loops BFS layers:
               ├─► For each node, emit "simulation:update"
               ├─► Await setTimeout(30ms) (Yields thread, simulates latency)
               └─► Next node...
           └─► Persists simulation details to DB
               └─► Emits "simulation:end" (UUID, Severity, Total Score)
```

1.  **Global Toast System**: A root `<GlobalToasts />` component listens to these events globally, showing a banner overlay when a simulation starts or finishes across all pages.
2.  **Live Node Highlights**: The React Flow view in `/graph` listens to the same socket stream, changing node colors and animating connecting edges in real-time as the failure propagates.

---

## 7. Results & Discussion

### Scenario Walkthroughs

#### Scenario A: Database Outage (High-Impact Cascade)
*   **Failed Service**: `Postgres Database` (Criticality: `CRITICAL`).
*   **Propagation Cascade**: Since almost every microservice depends on the database (e.g., `Order Service`, `Auth Service`, `Payment Service`), a failure in `Postgres` cascades upstream immediately.
*   **Results**:
    *   **Blast Radius**: 14 services impacted.
    *   **Max Depth**: 3 levels deep.
    *   **Risk Score**: 640 (CRITICAL severity).
    *   **Visual Behavior**: The React Flow view lights up red at the bottom layer, and animations ripple upwards, turning almost the entire dashboard amber/red.

#### Scenario B: Notification Microservice Outage (Low-Impact Cascade)
*   **Failed Service**: `Email Notifier` (Criticality: `LOW`).
*   **Propagation Cascade**: Only non-essential background tasks or logging frameworks depend on this service.
*   **Results**:
    *   **Blast Radius**: 1 service impacted.
    *   **Max Depth**: 1 level.
    *   **Risk Score**: 15 (LOW severity).
    *   **Visual Behavior**: The failure is isolated, and other business-critical systems continue to function normally.

---

## 8. Prerequisites & Execution Guide

### Prerequisites
*   **Node.js 20+**
*   **npm 10+**

### Installation

Clone the repository and run these setup commands from the root directory:

```bash
# 1. Setup the Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate      # Applies migrations & creates local sqlite dev.db
npm run seed                # Seeds the database with 24 services and 29 dependencies

# 2. Setup the Frontend (in a new terminal)
cd ../frontend
npm install
```

### Running the Application

Start both development servers from the root directory:

```bash
# Terminal 1: Start the Backend (Port 4000)
cd backend
npm run dev

# Terminal 2: Start the Frontend (Port 3000)
cd frontend
npm run dev
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

---

## 9. Verification & Code Correctness

### Automated Testing Suite
A comprehensive unit test suite has been implemented using **Vitest** in the backend. 
To run the test suite:
```bash
cd backend
npm run test
```
The suite includes test cases validating:
1.  **Direct Cycles**: Rejection of edge $A \to A$.
2.  **Transitive Cycles**: Rejection of edge $A \to B \to C \to A$ with cycle path output.
3.  **Blast Radius Depth**: Correct depth categorization for linear chains.
4.  **Leaf Node Isolation**: Leaf node failure does not propagate backwards down dependencies.
5.  **Multi-Service Outages**: Collisions of multiple starting failure sources are merged correctly without double-counting.

---

## 10. Future Work & Extensibility

If given more time, the next steps for architectural scaling are:
1.  **Probabilistic Failure Modeling**: Introduce a probability coefficient ($P_{\text{fail}}$) on edges, running Monte Carlo simulations to show likelihoods of failure.
2.  **Staged Recovery Simulations**: Model recovery times ($MTTR$) to simulate how the system recovers when downstream services are restored.
3.  **Real Infrastructure Integrations**: Implement an ingestion daemon to fetch live services and edges from Kubernetes namespaces or AWS CloudMap resources.