# SimOps

SimOps is an API-first operations platform for immersive training and simulation products. It coordinates training scenarios and sessions, accepts telemetry from an external simulation client, processes events asynchronously, calculates performance metrics, and gives operators a clear place to follow and review each run.

The project focuses on one complete vertical slice:

**Choose scenario -> create session -> run simulation -> stream telemetry -> process events -> update the operator view -> score the session -> review the outcome**

## Product flow

The web application has four concrete surfaces:

- **Overview** explains the product and shows recent sessions.
- **Scenarios** lists available procedures and creates participant sessions.
- **Session detail** follows procedure progress, live telemetry, warnings and score updates.
- **Reviews** lists completed runs and opens their evidence trail.

There is no fabricated preview state in the application. If the database is empty or a session has not received telemetry, the interface says so explicitly.

## Browser-run demo

The included TypeScript simulator now runs as its own service alongside the API, worker and web application.

A ready session exposes a **Run simulation** button. Clicking it asks the API to start the demo simulator for that session. The simulator then behaves like an external simulation client and posts telemetry back through the normal JSON telemetry endpoint.

This means a reviewer can exercise the complete demo from the browser without opening another terminal.

The simulator control endpoint is internal infrastructure for the proof-of-work demo. Telemetry still travels through the same API contract an external Unity-style client would use.

## Why I built it

The interesting engineering problem is the contract between an unreliable external simulation client and a backend that needs to remain correct when events repeat or reconnect after an interruption.

Every telemetry event has a stable `eventId`. PostgreSQL enforces uniqueness, ingestion acknowledges duplicates without applying them twice, and a BullMQ worker handles scoring and projection updates outside the request path.

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
Browser
   |
   | run demo
   v
NestJS API ----------> Demo simulator service
   ^                         |
   |                         | JSON telemetry
   |                         v
   +------------------- NestJS telemetry API
                              |
                              +--> PostgreSQL
                              |
                              +--> Redis / BullMQ --> Worker
                                                     |
                                                     +--> scoring + projections
                                                     +--> Redis pub/sub
                                                              |
                                                              v
                                                     Next.js operator UI
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
3. Open the ready session.
4. Click **Run simulation**.
5. Watch procedure progress and session activity update in real time.
6. Open **Reviews** after completion.

The original CLI path is still available for development:

```bash
npm run sim
```

You can target a specific session with:

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
apps/simulator      TypeScript simulation-client emulator and demo service
packages/contracts  shared domain contracts and scoring helpers
docs                architecture and decision records
```

## Scope

This is a compact proof-of-work project. Authentication, multi-tenant administration, payments and large-scale analytics are intentionally outside the demo scope so the core session and telemetry path stays easy to inspect.
