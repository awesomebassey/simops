import type { TelemetryEvent, TelemetryType } from '@simops/contracts';

const api = process.env.SIMOPS_API_URL ?? 'http://localhost:4000';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function post(event: TelemetryEvent) {
  const response = await fetch(`${api}/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  console.log(event.type.padEnd(20), event.stepKey ?? '', await response.json());
}

async function resolveSession() {
  if (process.env.SIMOPS_SESSION_ID) return { id: process.env.SIMOPS_SESSION_ID };

  const recent = await fetch(`${api}/sessions`);
  if (recent.ok) {
    const sessions = await recent.json() as Array<{
      id: string;
      status: string;
      scenario?: { name?: string };
    }>;
    const ready = sessions.find(session =>
      session.status === 'READY' && session.scenario?.name === 'Emergency Equipment Inspection',
    );
    if (ready) return { id: ready.id };
  }

  const seed = await fetch(`${api}/sessions/demo`, { method: 'POST' });
  if (!seed.ok) throw new Error(`${seed.status} ${await seed.text()}`);
  return seed.json() as Promise<{ id: string }>;
}

async function run() {
  const session = await resolveSession();
  let n = 1;

  const emit = async (type: TelemetryType, stepKey?: string, metadata?: TelemetryEvent['metadata']) => {
    await post({
      eventId: `demo-${session.id}-${n++}`,
      sessionId: session.id,
      type,
      timestamp: new Date().toISOString(),
      stepKey,
      metadata,
    });
    await sleep(650);
  };

  await emit('SESSION_STARTED');
  for (const step of ['ppe-check', 'isolate-system', 'inspect-gauge', 'inspect-valve']) {
    await emit('STEP_COMPLETED', step);
  }
  await emit('WARNING', 'inspect-valve', { code: 'PRESSURE_VARIANCE', value: 18 });
  await emit('STEP_COMPLETED', 'identify-fault');
  await emit('DECISION_MADE', 'select-action', { selected: 'pressure_valve', correct: true });
  for (const step of ['select-action', 'verify-repair', 'restore-system', 'close-inspection']) {
    await emit('STEP_COMPLETED', step);
  }
  await emit('SESSION_COMPLETED');

  console.log(`\nSession ${session.id} completed`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
