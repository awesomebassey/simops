import { IsISO8601, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
const TYPES = ['SESSION_STARTED','STEP_COMPLETED','DECISION_MADE','WARNING','CRITICAL_ERROR','SESSION_COMPLETED'] as const;
export class TelemetryDto {
  @IsString() eventId!: string;
  @IsString() sessionId!: string;
  @IsIn(TYPES) type!: (typeof TYPES)[number];
  @IsISO8601() timestamp!: string;
  @IsOptional() @IsString() stepKey?: string;
  @IsOptional() @IsObject() metadata?: Record<string, string | number | boolean | null>;
}
