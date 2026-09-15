import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { TelemetryDto } from './dto';
import { TelemetryService } from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}
  @Post()
  @HttpCode(202)
  ingest(@Body() input: TelemetryDto) { return this.telemetry.ingest(input); }
}
