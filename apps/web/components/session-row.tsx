import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Session } from '../lib/types';
import { StatusPill } from './status-pill';

export function SessionRow({ session }: { session: Session }) {
  const total = session.totalSteps || session.scenario.steps?.length || 0;
  const progress = total ? Math.min(100, Math.round((session.completedSteps / total) * 100)) : 0;

  return (
    <Link className="session-row" href={`/sessions/${session.id}`}>
      <div className="session-primary">
        <strong>{session.participantName}</strong>
        <span>{session.scenario.name}</span>
      </div>
      <div className="session-progress">
        <span>{progress}% complete</span>
        <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
      </div>
      <StatusPill status={session.status} />
      <ArrowUpRight size={18} />
    </Link>
  );
}
