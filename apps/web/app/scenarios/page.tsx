'use client';

import { ArrowRight, Layers3, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';
import type { Scenario, Session } from '../../lib/types';

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setScenarios(await apiRequest<Scenario[]>('/scenarios'));
      setError('');
    } catch {
      setError('SimOps cannot load scenarios right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createSample = async () => {
    setSubmitting(true);
    setError('');
    try {
      const session = await apiRequest<Session>('/sessions/demo', { method: 'POST' });
      router.push(`/sessions/${session.id}`);
    } catch {
      setError('The sample scenario could not be created.');
      setSubmitting(false);
    }
  };

  const startSession = async (event: FormEvent, scenarioId: string) => {
    event.preventDefault();
    if (!participantName.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const session = await apiRequest<Session>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ scenarioId, participantName: participantName.trim() }),
      });
      router.push(`/sessions/${session.id}`);
    } catch {
      setError('The session could not be created.');
      setSubmitting(false);
    }
  };

  return (
    <section className="content-section page-top">
      <div className="page-intro">
        <div>
          <h1>Training scenarios</h1>
          <p>Choose a procedure, assign a participant and create a session that an external simulation client can drive.</p>
        </div>
      </div>

      {error && <p className="inline-error">{error}</p>}

      {loading && <div className="empty-state">Loading scenarios…</div>}

      {!loading && scenarios.length === 0 && (
        <div className="empty-state large-empty">
          <Layers3 size={32} />
          <h2>No scenarios yet</h2>
          <p>Create the included inspection scenario and a ready session to explore the full workflow.</p>
          <button className="button button-primary" onClick={createSample} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create sample scenario'} <ArrowRight size={18} />
          </button>
        </div>
      )}

      <div className="scenario-grid">
        {scenarios.map(scenario => {
          const steps = Array.isArray(scenario.steps) ? scenario.steps.length : scenario.totalSteps ?? 0;
          const isSelected = selected === scenario.id;
          return (
            <article className="scenario-card" key={scenario.id}>
              <div className="scenario-art" aria-hidden="true"><div /><div /><div /></div>
              <div className="scenario-body">
                <div className="scenario-meta">
                  <span>{steps} procedure steps</span>
                  <span>{scenario.sessionCount ?? 0} sessions</span>
                </div>
                <h2>{scenario.name}</h2>
                <p>{scenario.description}</p>

                {!isSelected ? (
                  <button className="button button-secondary" onClick={() => {
                    setSelected(scenario.id);
                    setParticipantName('');
                  }}>
                    <Play size={17} /> Start session
                  </button>
                ) : (
                  <form className="start-session-form" onSubmit={event => startSession(event, scenario.id)}>
                    <label htmlFor={`participant-${scenario.id}`}>Participant name</label>
                    <div className="form-row">
                      <input
                        id={`participant-${scenario.id}`}
                        value={participantName}
                        onChange={event => setParticipantName(event.target.value)}
                        placeholder="Enter participant name"
                        autoFocus
                      />
                      <button className="button button-primary" disabled={submitting || participantName.trim().length < 2}>
                        {submitting ? 'Creating…' : 'Continue'} <ArrowRight size={17} />
                      </button>
                    </div>
                    <button type="button" className="text-button" onClick={() => setSelected(null)}>Cancel</button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
