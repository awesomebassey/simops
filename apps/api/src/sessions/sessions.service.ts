import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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

  async simulate(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'READY') {
      throw new BadRequestException('Only ready sessions can start the demo simulator');
    }

    const simulatorUrl = process.env.SIMULATOR_URL ?? 'http://localhost:4100';

    let response: Response;
    try {
      response = await fetch(`${simulatorUrl}/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
    } catch {
      throw new ServiceUnavailableException('Demo simulator is not available');
    }

    if (response.status === 409) {
      throw new BadRequestException('This simulation is already running');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Demo simulator could not start');
    }

    return { started: true, sessionId: id };
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
