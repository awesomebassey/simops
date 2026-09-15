# Architecture

## Goal

SimOps demonstrates the backend-heavy full-stack surface around an immersive training client. The core requirement is simple: accept a stream of training events without double-applying retries, process them outside the request path, and give an operator a live, trustworthy view of progress.

## Components

### Simulation client emulator

A small TypeScript process behaves like an external Unity application. It starts a session, completes procedure steps, reports decisions and warnings, then closes the session. The wire contract is ordinary JSON over HTTP, which keeps the integration easy to reproduce.

### API

NestJS owns session lifecycle and telemetry ingestion. The request path validates the event, verifies the session, inserts the event using a unique client-generated identifier, and queues it for processing.

### PostgreSQL

PostgreSQL is the source of truth for scenarios, sessions and raw telemetry. `TelemetryEvent.eventId` is unique. That database rule, not an in-memory check, is the final guarantee that a retry cannot become a second domain event.

### Redis and BullMQ

Accepted events are queued for background processing. This lets ingestion remain fast and isolates scoring or projection work from client latency.

### Worker

The worker applies events to the session projection, recalculates the score and records processing state. The scoring function lives in the shared contracts package so it can be tested independently from the queue runtime.

### Web console

The Next.js console is built around system status, procedure progression, telemetry and session integrity. The information hierarchy favors live operational awareness over dashboard decoration.

## Failure model

- Duplicate event: accepted as a retry, not queued twice.
- Unknown session: rejected before persistence.
- Worker failure: raw event remains in PostgreSQL and BullMQ can retry processing.
- Client reconnect: the simulator can resend its last event IDs safely.
- Slow scoring: ingestion still responds after persistence and queue handoff.

## Production extension

For a larger deployment, the next steps would be an outbox between PostgreSQL and BullMQ, authenticated device identities, per-session sequence validation, object storage for heavier evidence, OpenTelemetry traces, rate limits, and horizontally scaled workers.
