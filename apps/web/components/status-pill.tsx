import type { Session } from '../lib/types';

const labels: Record<Session['status'], string> = {
  READY: 'Ready',
  LIVE: 'Live',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export function StatusPill({ status }: { status: Session['status'] }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{labels[status]}</span>;
}
