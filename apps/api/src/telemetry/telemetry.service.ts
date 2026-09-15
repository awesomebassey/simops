import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TelemetryEvent } from '@simops/contracts';
import { PrismaService } from '../prisma.service';
import { QueueService } from '../queue.service';
import { TelemetryDto } from './dto';

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService, private readonly queue: QueueService) {}

  async ingest(input: TelemetryDto) {
    const session = await this.prisma.session.findUnique({ where: { id: input.sessionId }, select: { id: true } });
    if (!session) throw new NotFoundException('Session not found');

    try {
      await this.prisma.telemetryEvent.create({
        data: {
          eventId: input.eventId,
          sessionId: input.sessionId,
          type: input.type,
          timestamp: new Date(input.timestamp),
          stepKey: input.stepKey,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { accepted: true, duplicate: true, eventId: input.eventId };
      }
      throw error;
    }

    await this.queue.enqueue(input as TelemetryEvent);
    return { accepted: true, duplicate: false, eventId: input.eventId };
  }
}
