export type SessionStatus = 'READY' | 'LIVE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type TelemetryType = 'SESSION_STARTED' | 'STEP_COMPLETED' | 'DECISION_MADE' | 'WARNING' | 'CRITICAL_ERROR' | 'SESSION_COMPLETED';

export interface TelemetryEvent {
  eventId: string;
  sessionId: string;
  type: TelemetryType;
  timestamp: string;
  stepKey?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SessionMetrics {
  completedSteps: number;
  totalSteps: number;
  criticalErrors: number;
  warnings: number;
  score: number;
  durationMs: number;
}

export interface SessionProjection {
  id: string;
  participantName: string;
  scenarioName: string;
  status: SessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  metrics: SessionMetrics;
}

export function calculateScore(input: {
  completedSteps: number;
  totalSteps: number;
  criticalErrors: number;
  incorrectDecisions: number;
}): number {
  const completion = input.totalSteps === 0 ? 0 : (input.completedSteps / input.totalSteps) * 100;
  const penalty = input.criticalErrors * 12 + input.incorrectDecisions * 5;
  return Math.max(0, Math.min(100, Math.round(completion - penalty)));
}
