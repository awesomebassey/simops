import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { LiveGateway } from './live.gateway';
import { PrismaService } from './prisma.service';
import { QueueService } from './queue.service';
import { ScenariosController } from './scenarios/scenarios.controller';
import { ScenariosService } from './scenarios/scenarios.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { TelemetryController } from './telemetry/telemetry.controller';
import { TelemetryService } from './telemetry/telemetry.service';

@Module({
  controllers: [HealthController, SessionsController, ScenariosController, TelemetryController],
  providers: [PrismaService, QueueService, SessionsService, ScenariosService, TelemetryService, LiveGateway],
})
export class AppModule {}
