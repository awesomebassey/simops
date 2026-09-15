import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSessionDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  private withTotalSteps<T extends { scenario: { steps: unknown } }>(session: T) {
    return {
      ...session,
      totalSteps: Array.isArray(session.scenario.steps) ? session.scenario.steps.length : 0,
    };
  }

  async get(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { scenario: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    return this.withTotalSteps(session);
  }

  async recent() {
    const sessions = await this.prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: { scenario: true },
    });

    return sessions.map(session => this.withTotalSteps(session));
  }

  async create(input: CreateSessionDto) {
    const scenario = await this.prisma.scenario.findUnique({ where: { id: input.scenarioId } });
    if (!scenario) throw new NotFoundException('Scenario not found');

    const session = await this.prisma.session.create({
      data: {
        scenarioId: input.scenarioId,
        participantName: input.participantName.trim(),
      },
      include: { scenario: true },
    });

    return this.withTotalSteps(session);
  }

  async events(id: string, take = 20) {
    return this.prisma.telemetryEvent.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    });
  }

  async seedDemo() {
    let scenario = await this.prisma.scenario.findFirst({
      where: { name: 'Emergency Equipment Inspection' },
      orderBy: { createdAt: 'asc' },
    });

    if (!scenario) {
      scenario = await this.prisma.scenario.create({
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
            { key: 'close-inspection', label: 'Close the inspection' },
          ],
        },
      });
    }

    const session = await this.prisma.session.create({
      data: { scenarioId: scenario.id, participantName: 'Maya Chen' },
      include: { scenario: true },
    });

    return this.withTotalSteps(session);
  }
}
