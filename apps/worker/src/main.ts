import { PrismaClient } from '@prisma/client';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { calculateScore, type TelemetryEvent } from '@simops/contracts';

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const publisher = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

const worker = new Worker<TelemetryEvent>('telemetry', async (job) => {
  const event = job.data;
  const current = await prisma.session.findUnique({ where: { id: event.sessionId }, include: { scenario: true } });
  if (!current) return;

  const metadata = event.metadata ?? {};
  const updates: Record<string, unknown> = {};
  if (event.type === 'SESSION_STARTED') Object.assign(updates, { status: 'LIVE', startedAt: new Date(event.timestamp) });
  if (event.type === 'STEP_COMPLETED') updates.completedSteps = { increment: 1 };
  if (event.type === 'WARNING') updates.warnings = { increment: 1 };
  if (event.type === 'CRITICAL_ERROR') updates.criticalErrors = { increment: 1 };
  if (event.type === 'DECISION_MADE' && metadata.correct === false) updates.incorrectDecisions = { increment: 1 };
  if (event.type === 'SESSION_COMPLETED') Object.assign(updates, { status: 'COMPLETED', completedAt: new Date(event.timestamp) });

  await prisma.session.update({ where: { id: event.sessionId }, data: updates });
  const next = await prisma.session.findUnique({ where: { id: event.sessionId }, include: { scenario: true } });
  if (!next) return;
  const totalSteps = Array.isArray(next.scenario.steps) ? next.scenario.steps.length : 0;
  const score = calculateScore({ completedSteps: next.completedSteps, totalSteps, criticalErrors: next.criticalErrors, incorrectDecisions: next.incorrectDecisions });
  const projection = await prisma.session.update({ where: { id: next.id }, data: { score }, include: { scenario: true } });
  await publisher.publish('simops:session-updated', JSON.stringify({ ...projection, totalSteps }));
  await prisma.telemetryEvent.update({ where: { eventId: event.eventId }, data: { state: 'PROCESSED', processedAt: new Date() } });
}, { connection });

worker.on('completed', job => console.log(`processed ${job.id}`));
worker.on('failed', (job, error) => console.error(`failed ${job?.id}`, error));
console.log('SimOps telemetry worker ready');
