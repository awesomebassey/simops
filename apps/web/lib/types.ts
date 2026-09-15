export type ScenarioStep = {
  key: string;
  label: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
  totalSteps?: number;
  sessionCount?: number;
};

export type Session = {
  id: string;
  participantName: string;
  status: 'READY' | 'LIVE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  completedSteps: number;
  criticalErrors: number;
  warnings: number;
  incorrectDecisions: number;
  score: number;
  totalSteps: number;
  scenario: Scenario;
  createdAt: string;
  updatedAt: string;
};

export type TelemetryEvent = {
  id: string;
  eventId: string;
  type: string;
  timestamp: string;
  stepKey?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  state: string;
};
