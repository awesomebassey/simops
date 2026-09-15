import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryService } from './telemetry/telemetry.service';
import { LiveGateway } from './live.gateway';

@Module({
  controllers: [SessionsController, TelemetryController],
  providers: [PrismaService, QueueService, SessionsService, TelemetryService, LiveGateway],
})
export class AppModule {}
