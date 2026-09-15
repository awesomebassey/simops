import { Prisma } from '@prisma/client';
import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  it('accepts a duplicate without queueing it twice', async () => {
    const prisma = {
      session: { findUnique: jest.fn().mockResolvedValue({ id: 's1' }) },
      telemetryEvent: { create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' })) },
    } as any;
    const queue = { enqueue: jest.fn() } as any;
    const service = new TelemetryService(prisma, queue);
    const result = await service.ingest({ eventId: 'evt-1', sessionId: 's1', type: 'STEP_COMPLETED', timestamp: new Date().toISOString() });
    expect(result).toEqual({ accepted: true, duplicate: true, eventId: 'evt-1' });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
