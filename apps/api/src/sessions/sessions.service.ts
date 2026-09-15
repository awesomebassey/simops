import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const session = await this.prisma.session.findUnique({ where: { id }, include: { scenario: true } });
    if (!session) throw new NotFoundException('Session not found');
    const steps = Array.isArray(session.scenario.steps) ? session.scenario.steps.length : 0;
    return { ...session, totalSteps: steps };
  }

  async recent() {
    return this.prisma.session.findMany({ orderBy: { createdAt: 'desc' }, take: 12, include: { scenario: true } });
  }

  async events(id: string, take = 8) {
    return this.prisma.telemetryEvent.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Math.max(take, 1), 50),
    });
  }

  async seedDemo() {
    const scenario = await this.prisma.scenario.create({
      data: {
        name: 'Emergency Equipment Inspection',
        description: 'A field inspection exercise focused on fault recognition, corrective action and safe completion.',
        steps: [
          { key: 'ppe-check', label: 'Confirm protective equipment' },
          { key: 'isolate-system', label: 'Isolate the system' },
          { key: 'inspect-gauge', label: 'Inspect pressure gauge' },
          { key: 'inspect-valve', label: 'Inspect pressure valve' },
          { key: 'identify-fault', label: 'Identify the fault' },
          { key: 'select-action', label: 'Select corrective action' },
          { key: 'verify-repair', label: 'Verify the repair' },
          { key: 'restore-system', label: 'Restore the system' },
          { key: 'close-inspection', label: 'Close the inspection' }
        ]
      }
    });
    return this.prisma.session.create({ data: { scenarioId: scenario.id, participantName: 'Maya Chen' }, include: { scenario: true } });
  }
}
