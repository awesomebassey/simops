import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateSessionDto } from './dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  recent() {
    return this.sessions.recent();
  }

  @Post()
  create(@Body() input: CreateSessionDto) {
    return this.sessions.create(input);
  }

  @Post('demo')
  seedDemo() {
    return this.sessions.seedDemo();
  }

  @Get(':id/events')
  events(
    @Param('id') id: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
  ) {
    return this.sessions.events(id, take);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sessions.get(id);
  }
}
