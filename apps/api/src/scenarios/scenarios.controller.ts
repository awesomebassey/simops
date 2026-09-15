import { Controller, Get, Param } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenarios: ScenariosService) {}

  @Get()
  list() {
    return this.scenarios.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.scenarios.get(id);
  }
}
