import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { TelemetryEvent, TelemetryType } from '@simops/contracts';

const api = process.env.SIMOPS_API_URL ?? 'http://localhost:4000';
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type SessionPayload = {
  id: string;
  status: string;
  scenario: {
    name: string;
    steps: Array<{ key: string; label: string }>;
  };
};

async function post(event: TelemetryEvent) {
  const response = await fetch(`${api}/telemetry`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  console.log(event.type.padEnd(20), event.stepKey ?? '', await response.json());
}

async function getSession(id: string) {
  const response = await fetch(`${api}/sessions/${id}`);
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return response.json() as Promise<SessionPayload>;
}

async function resolveSession() {
  if (process.env.SIMOPS_SESSION_ID) return getSession(process.env.SIMOPS_SESSION_ID);

  const recent = await fetch(`${api}/sessions`);
  if (recent.ok) {
    const sessions = await recent.json() as SessionPayload[];
    const ready = sessions.find(session => session.status === 'READY');
    if (ready) return ready;
  }

  const seed = await fetch(`${api}/sessions/demo`, { method: 'POST' });
  if (!seed.ok) throw new Error(`${seed.status} ${await seed.text()}`);
  return seed.json() as Promise<SessionPayload>;
}

async function runSimulation(sessionId?: string) {
  const session = sessionId ? await getSession(sessionId) : await resolveSession();
  if (session.status !== 'READY') throw new Error('Session is not ready for simulation');

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
    await sleep(700);
  };

  await emit('SESSION_STARTED');

  for (const step of session.scenario.steps) {
    if (step.key === 'select-action') {
      await emit('DECISION_MADE', step.key, { selected: 'pressure_valve', correct: true });
    }

    await emit('STEP_COMPLETED', step.key);

    if (step.key === 'inspect-valve') {
      await emit('WARNING', step.key, { code: 'PRESSURE_VARIANCE', value: 18 });
    }
  }

  await emit('SESSION_COMPLETED');
  console.log(`Session ${session.id} completed`);
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as { sessionId?: string };
}

function send(response: ServerResponse, status: number, body: Record<string, unknown>) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function serve() {
  const running = new Set<string>();
  const port = Number(process.env.SIMULATOR_PORT ?? 4100);

  const server = createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      return send(response, 200, { ok: true });
    }

    if (request.method !== 'POST' || request.url !== '/run') {
      return send(response, 404, { error: 'Not found' });
    }

    try {
      const { sessionId } = await readJson(request);
      if (!sessionId) return send(response, 400, { error: 'sessionId is required' });
      if (running.has(sessionId)) return send(response, 409, { error: 'Simulation already running' });

      running.add(sessionId);
      send(response, 202, { started: true, sessionId });

      void runSimulation(sessionId)
        .catch(error => console.error(`Simulation ${sessionId} failed`, error))
        .finally(() => running.delete(sessionId));
    } catch {
      send(response, 400, { error: 'Invalid request body' });
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`SimOps demo simulator listening on ${port}`);
  });
}

if (process.argv[2] === 'serve') {
  serve();
} else {
  runSimulation().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
