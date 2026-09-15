import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ScenariosService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const scenarios = await this.prisma.scenario.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { sessions: true } } },
    });

    return scenarios.map(({ _count, ...scenario }) => ({
      ...scenario,
      totalSteps: Array.isArray(scenario.steps) ? scenario.steps.length : 0,
      sessionCount: _count.sessions,
    }));
  }

  async get(id: string) {
    const scenario = await this.prisma.scenario.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });

    if (!scenario) throw new NotFoundException('Scenario not found');

    const { _count, ...rest } = scenario;
    return {
      ...rest,
      totalSteps: Array.isArray(rest.steps) ? rest.steps.length : 0,
      sessionCount: _count.sessions,
    };
  }
}
