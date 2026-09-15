# ADR 002: scoring and projections run outside ingestion

## Decision

The ingestion endpoint persists accepted events and hands them to BullMQ. Scoring and session projection updates run in a worker.

## Why

A simulation client should not wait for analytics work before it can continue sending telemetry. Keeping the request path small also makes latency easier to reason about and lets workers scale independently.

## Tradeoff

The operator view becomes eventually consistent by a short interval. The UI makes processing status visible, which is preferable to hiding that behavior.
