import { IsString, Length } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  scenarioId!: string;

  @IsString()
  @Length(2, 80)
  participantName!: string;
}
