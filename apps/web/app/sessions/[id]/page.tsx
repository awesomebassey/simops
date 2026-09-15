'use client';

import { AlertTriangle, ArrowLeft, Check, Circle, Clock3, Radio, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { StatusPill } from '../../../components/status-pill';
import { apiRequest, WS_URL } from '../../../lib/api';
import type { Session, TelemetryEvent } from '../../../lib/types';

const eventNames: Record<string, string> = {
  SESSION_STARTED: 'Session started',
  STEP_COMPLETED: 'Procedure step completed',
  DECISION_MADE: 'Decision recorded',
  WARNING: 'Warning recorded',
  CRITICAL_ERROR: 'Critical error recorded',
  SESSION_COMPLETED: 'Session completed',
};

function formatDuration(startedAt: string | null, completedAt: string | null) {
  if (!startedAt) return 'Not started';
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function eventDescription(event: TelemetryEvent, session: Session) {
  const step = session.scenario.steps?.find(item => item.key === event.stepKey)?.label;
  if (event.type === 'WARNING' && event.metadata?.value !== undefined) {
    return `${step ?? 'Simulation'} · measured variance ${event.metadata.value}%`;
  }
  if (event.type === 'DECISION_MADE' && event.metadata?.selected) {
    return `${step ?? 'Decision'} · ${String(event.metadata.selected).replaceAll('_', ' ')}`;
  }
  return step ?? 'Simulation event';
}

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  const loadEvents = useCallback(async () => {
    try { setEvents(await apiRequest<TelemetryEvent[]>(`/sessions/${id}/events?take=50`)); } catch {}
  }, [id]);

  const loadSession = useCallback(async () => {
    try {
      const data = await apiRequest<Session>(`/sessions/${id}`);
      setSession(data);
      setError('');
      await loadEvents();
    } catch {
      setError('This session could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id, loadEvents]);

  useEffect(() => { loadSession(); }, [loadSession]);

  useEffect(() => {
    if (!session) return;
    const socket = io(`${WS_URL}/live`, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('watch.session', session.id));
    socket.on('session.updated', (update: Session) => {
      setSession(update);
      loadEvents();
    });
    return () => { socket.close(); };
  }, [session?.id, loadEvents]);

  useEffect(() => {
    if (!session || session.status === 'COMPLETED') return;
    const timer = setInterval(() => setTick(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [session?.status]);

  const total = session?.totalSteps || session?.scenario.steps?.length || 0;
  const progress = session && total ? Math.min(100, Math.round((session.completedSteps / total) * 100)) : 0;
  const duration = useMemo(() => session ? formatDuration(session.startedAt, session.completedAt) : '', [session, session?.startedAt, session?.completedAt, session?.status]);

  if (loading) return <section className="content-section page-top"><div className="empty-state">Loading session…</div></section>;
  if (!session || error) return <section className="content-section page-top"><div className="empty-state large-empty"><h1>Session unavailable</h1><p>{error}</p><Link className="button button-secondary" href="/"><ArrowLeft size={17}/> Back to overview</Link></div></section>;

  const steps = Array.isArray(session.scenario.steps) ? session.scenario.steps : [];

  return (
    <section className="content-section page-top">
      <Link className="back-link" href="/"><ArrowLeft size={16} /> All sessions</Link>

      <div className="session-title-row">
        <div>
          <h1>{session.scenario.name}</h1>
          <p>{session.participantName}</p>
        </div>
        <StatusPill status={session.status} />
      </div>

      {session.status === 'READY' && (
        <div className="waiting-banner">
          <Radio size={22} />
          <div><strong>Waiting for the simulation client</strong><span>This session is ready. Progress begins when the first telemetry event arrives.</span></div>
        </div>
      )}

      <div className="session-summary-grid">
        <article><span>Progress</span><strong>{progress}%</strong><small>{session.completedSteps} of {total} steps</small></article>
        <article><span>Score</span><strong>{session.status === 'READY' ? 'Not scored' : `${session.score}%`}</strong><small>Pass target 80%</small></article>
        <article><span>Warnings</span><strong>{session.warnings}</strong><small>{session.criticalErrors} critical errors</small></article>
        <article><span>Elapsed time</span><strong>{duration}</strong><small>{session.completedAt ? 'Final duration' : 'Current duration'}</small></article>
      </div>

      <div className="session-layout">
        <article className="detail-panel procedure-panel">
          <div className="panel-title">
            <div><h2>Procedure progress</h2><p>{session.scenario.description}</p></div>
            <strong>{session.completedSteps}/{total}</strong>
          </div>
          <div className="large-progress"><div style={{ width: `${progress}%` }} /></div>

          <div className="procedure-list">
            {steps.map((step, index) => {
              const completed = index < session.completedSteps;
              const current = index === session.completedSteps && session.status === 'LIVE';
              return (
                <div className={current ? 'procedure-step current' : completed ? 'procedure-step complete' : 'procedure-step'} key={step.key}>
                  <div className="step-icon">{completed ? <Check size={16} /> : current ? <Radio size={16} /> : <Circle size={12} />}</div>
                  <div><strong>{step.label}</strong><span>{completed ? 'Completed' : current ? 'In progress' : 'Waiting'}</span></div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="detail-panel activity-panel">
          <div className="panel-title"><div><h2>Session activity</h2><p>Events received from the simulation client.</p></div></div>

          {events.length === 0 ? (
            <div className="activity-empty"><Clock3 size={24} /><p>No telemetry has arrived for this session yet.</p></div>
          ) : (
            <div className="event-list">
              {events.map(event => {
                const risky = event.type === 'WARNING' || event.type === 'CRITICAL_ERROR';
                return (
                  <div className="event-item" key={event.eventId}>
                    <div className={risky ? 'event-icon warning' : 'event-icon'}>{risky ? <AlertTriangle size={16}/> : <Check size={16}/>}</div>
                    <div>
                      <strong>{eventNames[event.type] ?? event.type.replaceAll('_', ' ')}</strong>
                      <span>{eventDescription(event, session)}</span>
                    </div>
                    <time>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </div>

      {session.status === 'COMPLETED' && (
        <div className={session.score >= 80 ? 'result-banner pass' : 'result-banner fail'}>
          {session.score >= 80 ? <Check size={28} /> : <ShieldAlert size={28} />}
          <div>
            <strong>{session.score >= 80 ? 'Training outcome: Pass' : 'Training outcome: Review required'}</strong>
            <span>Final score {session.score}% · {session.criticalErrors} critical errors · {session.warnings} warnings</span>
          </div>
        </div>
      )}
    </section>
  );
}
