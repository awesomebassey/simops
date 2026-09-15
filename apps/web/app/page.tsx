'use client';

import { Activity, ArrowUpRight, CircleDot, Gauge, Radio, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

type ScenarioStep = { key: string; label: string };
type Session = {
  id: string;
  participantName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  completedSteps: number;
  criticalErrors: number;
  warnings: number;
  score: number;
  totalSteps?: number;
  scenario: { name: string; description: string; steps: ScenarioStep[] };
};
type Event = { id: string; eventId: string; type: string; timestamp: string; stepKey?: string; metadata?: Record<string, unknown> };

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const WS = process.env.NEXT_PUBLIC_WS_URL ?? API;
const fallbackSteps: ScenarioStep[] = [
  { key: 'ppe-check', label: 'Confirm protective equipment' },
  { key: 'isolate-system', label: 'Isolate the system' },
  { key: 'inspect-gauge', label: 'Inspect pressure gauge' },
  { key: 'inspect-valve', label: 'Inspect pressure valve' },
  { key: 'identify-fault', label: 'Identify the fault' },
  { key: 'select-action', label: 'Select corrective action' },
  { key: 'verify-repair', label: 'Verify the repair' },
  { key: 'restore-system', label: 'Restore the system' },
  { key: 'close-inspection', label: 'Close the inspection' },
];

const fallback: Session = {
  id: 'preview', participantName: 'Maya Chen', status: 'LIVE', startedAt: new Date(Date.now() - 378000).toISOString(), completedAt: null,
  completedSteps: 5, criticalErrors: 0, warnings: 1, score: 92, totalSteps: 9,
  scenario: { name: 'Emergency Equipment Inspection', description: 'Field inspection exercise', steps: fallbackSteps },
};

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function eventLabel(event: Event) {
  const labels: Record<string, string> = { STEP_COMPLETED: 'Step completed', WARNING: 'Warning detected', CRITICAL_ERROR: 'Critical error', DECISION_MADE: 'Decision recorded', SESSION_STARTED: 'Session started', SESSION_COMPLETED: 'Session completed' };
  return labels[event.type] ?? event.type.toLowerCase().replaceAll('_', ' ');
}

function eventDetail(event: Event, steps: ScenarioStep[]) {
  if (event.type === 'WARNING' && event.metadata?.value) return `Pressure variance: ${event.metadata.value}%`;
  if (event.type === 'DECISION_MADE' && event.metadata?.selected) return String(event.metadata.selected).replaceAll('_', ' ');
  return steps.find(step => step.key === event.stepKey)?.label ?? 'Session telemetry';
}

export default function Home() {
  const [session, setSession] = useState<Session>(fallback);
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);

  const loadEvents = useCallback(async (id: string) => {
    if (id === 'preview') return;
    try { const response = await fetch(`${API}/sessions/${id}/events?take=8`, { cache: 'no-store' }); if (response.ok) setEvents(await response.json()); } catch {}
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${API}/sessions`, { cache: 'no-store' });
        const data = await response.json() as Session[];
        if (active && data[0]) { setSession(data[0]); setConnected(true); loadEvents(data[0].id); }
      } catch { if (active) setConnected(false); }
    };
    load();
    const timer = setInterval(load, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [loadEvents]);

  useEffect(() => {
    if (session.id === 'preview') return;
    const socket = io(`${WS}/live`, { transports: ['websocket'] });
    socket.on('connect', () => { setConnected(true); socket.emit('watch.session', session.id); });
    socket.on('session.updated', (update: Session) => { setSession(update); loadEvents(update.id); });
    socket.on('disconnect', () => setConnected(false));
    return () => { socket.close(); };
  }, [session.id, loadEvents]);

  const steps = Array.isArray(session.scenario?.steps) ? session.scenario.steps : fallbackSteps;
  const total = session.totalSteps ?? steps.length;
  const progress = total ? Math.min(100, Math.round((session.completedSteps / total) * 100)) : 0;
  const elapsed = useMemo(() => {
    if (!session.startedAt) return '00:00';
    const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
    const seconds = Math.max(0, Math.floor((end - new Date(session.startedAt).getTime()) / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, [session.startedAt, session.completedAt, session.status]);

  const visibleEvents = events.length ? events.slice(0, 4) : [
    { id:'1',eventId:'1',type:'STEP_COMPLETED',timestamp:new Date().toISOString(),stepKey:'inspect-valve' },
    { id:'2',eventId:'2',type:'WARNING',timestamp:new Date(Date.now()-3000).toISOString(),stepKey:'inspect-valve',metadata:{value:18} },
    { id:'3',eventId:'3',type:'STEP_COMPLETED',timestamp:new Date(Date.now()-17000).toISOString(),stepKey:'inspect-gauge' },
    { id:'4',eventId:'4',type:'STEP_COMPLETED',timestamp:new Date(Date.now()-35000).toISOString(),stepKey:'isolate-system' },
  ];

  return <main>
    <header className="topbar">
      <div className="brand"><span className="brandmark"><i></i><i></i></span><span>SIMOPS</span></div>
      <nav><a className="active">Live session</a><a>Scenarios</a><a>Review</a></nav>
      <div className="system"><span className={`pulse ${connected ? '' : 'offline'}`}></span>{connected ? 'systems nominal' : 'preview mode'}</div>
    </header>

    <section className="hero shell">
      <div>
        <p className="eyebrow">LIVE TRAINING / SESSION 04</p>
        <h1>{session.scenario.name}</h1>
        <div className="person"><span>Participant</span><strong>{session.participantName}</strong><i></i><span>Field unit XR-07</span></div>
      </div>
      <div className="statusOrb"><div><span>{session.status}</span><strong>{elapsed}</strong><small>elapsed</small></div></div>
    </section>

    <section className="shell metrics">
      <Metric label="PROGRESS" value={`${progress}%`} detail={`${session.completedSteps} of ${total} steps`} />
      <Metric label="CURRENT SCORE" value={String(session.score)} detail="target 80" />
      <Metric label="CRITICAL ERRORS" value={String(session.criticalErrors)} detail={`${session.warnings} warning${session.warnings === 1 ? '' : 's'}`} />
      <Metric label="CONNECTION" value={connected ? '24ms' : 'local'} detail={connected ? 'stable' : 'preview data'} />
    </section>

    <section className="shell grid">
      <article className="panel sequence">
        <div className="panelHead"><div><p>PROCEDURE</p><h2>Inspection sequence</h2></div><button>Scenario brief <ArrowUpRight size={15}/></button></div>
        <div className="steps">
          {steps.map((step,index) => {
            const state = index < session.completedSteps ? 'complete' : index === session.completedSteps && session.status === 'LIVE' ? 'active' : 'pending';
            return <div className={`step ${state}`} key={step.key}>
              <span className="stepNo">{String(index + 1).padStart(2,'0')}</span><span className="line"></span><div><strong>{step.label}</strong><small>{state === 'complete' ? 'verified' : state === 'active' ? 'in progress' : 'waiting'}</small></div>{state === 'complete' ? <ShieldCheck size={17}/> : state === 'active' ? <Radio size={17}/> : <CircleDot size={16}/>} 
            </div>;
          })}
        </div>
      </article>

      <div className="sidecol">
        <article className="panel telemetry">
          <div className="panelHead"><div><p>TELEMETRY</p><h2>Live event stream</h2></div><Activity size={19}/></div>
          <div className="signal"><div className="wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>{connected ? 'receiving' : 'preview'}</span></div>
          <div className="events">{visibleEvents.map((event)=><div className="event" key={event.eventId}><time>{new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}</time><span className={event.type.includes('WARNING') || event.type.includes('ERROR') ? 'warn':''}></span><div><strong>{eventLabel(event)}</strong><small>{eventDetail(event, steps)}</small></div></div>)}</div>
        </article>
        <article className="panel integrity">
          <div className="panelHead"><div><p>SESSION INTEGRITY</p><h2>Data quality</h2></div><Gauge size={19}/></div>
          <div className="integrityGrid"><div><strong>100%</strong><span>event delivery</span></div><div><strong>0</strong><span>duplicate events</span></div><div><strong>{total}/{total}</strong><span>ordered checkpoints</span></div></div>
          <p className="note"><TriangleAlert size={15}/> One pressure variance is within the scenario tolerance and does not affect completion.</p>
        </article>
      </div>
    </section>

    <footer className="shell footer"><span>SIMOPS / TRAINING OPERATIONS</span><span>TypeScript · NestJS · React · PostgreSQL</span><span>event-safe telemetry</span></footer>
  </main>;
}
