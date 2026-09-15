# SimOps

SimOps is an API-first operations platform for immersive training and simulation products. It coordinates training scenarios and sessions, accepts telemetry from an external simulation client, processes events asynchronously, calculates performance metrics, and gives operators a clear place to follow and review each run.

The project focuses on one complete vertical slice:

**Choose scenario -> create session -> stream telemetry -> process events -> update the operator view -> score the session -> review the outcome**

## Product flow

The web application has four concrete surfaces:

- **Overview** explains the product and shows recent sessions.
- **Scenarios** lists available procedures and creates participant sessions.
- **Session detail** follows procedure progress, live telemetry, warnings and score updates.
- **Reviews** lists completed runs and opens their evidence trail.

There is no fabricated preview state in the application. If the database is empty or a session has not received telemetry, the interface says so explicitly.

## Why I built it

The interesting engineering problem is the contract between an unreliable external simulation client and a backend that needs to remain correct when events repeat or reconnect after an interruption.

Every telemetry event has a stable `eventId`. PostgreSQL enforces uniqueness, ingestion acknowledges duplicates without applying them twice, and a BullMQ worker handles scoring and projection updates outside the request path.

The included TypeScript simulator stands in for an external Unity-style client so the integration contract can be exercised without requiring a Unity runtime.

## Stack

- TypeScript
- NestJS
- Next.js and React
- PostgreSQL and Prisma
- Redis and BullMQ
- Redis pub/sub and Socket.IO
- Docker Compose
- Jest

## Architecture

```text
Simulation client / TypeScript emulator
                  |
                  | JSON telemetry
                  v
            NestJS API
             |      |
             |      +--> PostgreSQL
             |
             +--> Redis / BullMQ --> Worker --> scoring + projections
                                      |
                                      +--> Redis pub/sub
                                               |
                                               v
                                      Next.js operator console
```

## Quick start

Install host dependencies once:

```bash
npm install
```

Start the complete application stack:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

The default Compose configuration maps PostgreSQL to host port `5433` to avoid collisions with a common local PostgreSQL installation. Internal services still use PostgreSQL on port `5432`. Override it with `POSTGRES_PORT` if needed.

## Demo flow

1. Open **Scenarios**.
2. If the database is empty, create the included **Emergency Equipment Inspection** sample.
3. Create or open the ready session.
4. In another terminal, run:

```bash
npm run sim
```

The simulator reuses the oldest ready Emergency Equipment Inspection session when one exists. It then emits start, procedure, decision, warning and completion events. The session page updates through Socket.IO as the worker processes telemetry.

You can also target a specific session:

```bash
SIMOPS_SESSION_ID=<session-id> npm run sim
```

## Reliability decisions

### Idempotent ingestion

Every telemetry event carries a client-generated `eventId`. The database has a unique constraint on this value. A retry returns an accepted duplicate response instead of creating a second event or inflating the score.

### Fast request path

The API validates and stores telemetry, then pushes the event to BullMQ. Scoring, projections and live status updates happen in the worker so ingestion does not wait for downstream processing.

### Shared contracts

The API, worker and simulator share event contracts. This keeps event names, payloads and lifecycle states aligned across the system.

## Design approach

The web application is intentionally not styled like a terminal or generic admin dashboard. It uses a dark spatial-product canvas, large typography, restrained violet/cyan lighting, generous spacing and straightforward interaction states. Technical implementation details live in the repository documentation rather than being used as decorative UI copy.

The application does not claim affiliation with Lucid Reality Labs and does not copy Lucid branding or assets.

## Repository map

```text
apps/api            NestJS API and Prisma schema
apps/web            Next.js operator application
apps/worker         BullMQ processing and scoring
apps/simulator      TypeScript simulation-client emulator
packages/contracts  shared domain contracts and scoring helpers
docs                architecture and decision records
```

## Scope

This is a compact proof-of-work project. Authentication, multi-tenant administration, payments and large-scale analytics are intentionally outside the demo scope so the core session and telemetry path stays easy to inspect.
