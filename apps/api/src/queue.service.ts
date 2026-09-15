import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { TelemetryEvent } from '@simops/contracts';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly queue = new Queue<TelemetryEvent>('telemetry', { connection: this.connection });

  async enqueue(event: TelemetryEvent) {
    await this.queue.add('process', event, { jobId: event.eventId, removeOnComplete: 200, removeOnFail: 200 });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
