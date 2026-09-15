'use client';

import { ClipboardCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SessionRow } from '../../components/session-row';
import { apiRequest } from '../../lib/api';
import type { Session } from '../../lib/types';

export default function ReviewPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<Session[]>('/sessions')
      .then(data => {
        setSessions(data.filter(session => session.status === 'COMPLETED'));
        setError('');
      })
      .catch(() => setError('SimOps cannot load completed sessions right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="content-section page-top">
      <div className="page-intro">
        <div>
          <h1>Session reviews</h1>
          <p>Inspect completed training runs, their scores and the event trail behind each outcome.</p>
        </div>
      </div>

      {error && <p className="inline-error">{error}</p>}
      {loading && <div className="empty-state">Loading completed sessions…</div>}

      {!loading && sessions.length === 0 && (
        <div className="empty-state large-empty">
          <ClipboardCheck size={32} />
          <h2>No completed sessions yet</h2>
          <p>Completed simulation runs will appear here automatically once the final event is processed.</p>
        </div>
      )}

      <div className="session-list">
        {sessions.map(session => <SessionRow key={session.id} session={session} />)}
      </div>
    </section>
  );
}
