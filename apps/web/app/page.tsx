'use client';

import { ArrowRight, CirclePlay, Radio, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SessionRow } from '../components/session-row';
import { apiRequest } from '../lib/api';
import type { Session } from '../lib/types';

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await apiRequest<Session[]>('/sessions');
        if (active) {
          setSessions(data);
          setError('');
        }
      } catch {
        if (active) setError('SimOps cannot reach the API right now.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const summary = useMemo(() => {
    const live = sessions.filter(session => ['READY', 'LIVE', 'PROCESSING'].includes(session.status)).length;
    const completed = sessions.filter(session => session.status === 'COMPLETED');
    const average = completed.length
      ? Math.round(completed.reduce((total, session) => total + session.score, 0) / completed.length)
      : null;
    return { live, completed: completed.length, average };
  }, [sessions]);

  const createSample = async () => {
    setCreating(true);
    setError('');
    try {
      const session = await apiRequest<Session>('/sessions/demo', { method: 'POST' });
      router.push(`/sessions/${session.id}`);
    } catch {
      setError('The sample session could not be created. Check that the API is running.');
      setCreating(false);
    }
  };

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <h1>See every training session clearly.</h1>
          <p>
            SimOps coordinates immersive training scenarios, receives live events from a simulation client,
            and turns them into progress, safety signals and reviewable outcomes.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/scenarios">Browse scenarios <ArrowRight size={18} /></Link>
            <button className="button button-secondary" onClick={createSample} disabled={creating}>
              <CirclePlay size={18} /> {creating ? 'Creating…' : 'Create sample session'}
            </button>
          </div>
          {error && <p className="inline-error">{error}</p>}
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="hero-ring ring-one" />
          <div className="hero-ring ring-two" />
          <div className="hero-core"><Radio size={34} /></div>
        </div>
      </section>

      <section className="summary-strip">
        <div><strong>{summary.live}</strong><span>Active or ready sessions</span></div>
        <div><strong>{summary.completed}</strong><span>Completed sessions</span></div>
        <div><strong>{summary.average === null ? 'Not scored' : `${summary.average}%`}</strong><span>Average completed score</span></div>
      </section>

      <section className="content-section">
        <div className="section-heading split-heading">
          <div>
            <h2>Recent sessions</h2>
            <p>Open a session to follow progress, incoming events and the final result.</p>
          </div>
          <Link className="text-link" href="/review">View completed reviews <ArrowRight size={16} /></Link>
        </div>

        <div className="session-list">
          {loading && <div className="empty-state">Loading sessions…</div>}
          {!loading && sessions.length === 0 && (
            <div className="empty-state">
              <ShieldCheck size={28} />
              <h3>No sessions yet</h3>
              <p>Create a sample session or start one from a scenario. SimOps will show only real session data here.</p>
            </div>
          )}
          {sessions.slice(0, 8).map(session => <SessionRow key={session.id} session={session} />)}
        </div>
      </section>

      <section className="content-section how-it-works">
        <div className="section-heading">
          <h2>How SimOps fits around a simulation</h2>
          <p>The simulation stays focused on the immersive experience. SimOps handles the operational workflow around it.</p>
        </div>
        <div className="explain-grid">
          <article><span>01</span><h3>Choose a training scenario</h3><p>An operator creates a session for a participant using a defined procedure.</p></article>
          <article><span>02</span><h3>Receive simulation events</h3><p>An external client streams retry-safe telemetry as the participant moves through the exercise.</p></article>
          <article><span>03</span><h3>Review the outcome</h3><p>Progress, warnings and decisions are processed into a score and an evidence trail for review.</p></article>
        </div>
      </section>
    </>
  );
}
