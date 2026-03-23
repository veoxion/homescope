import { Controller, Get, Query } from '@nestjs/common';
import { PoisService } from './pois.service';
import { QueryPoisDto } from './dto/query-pois.dto';

@Controller('pois')
export class PoisController {
  constructor(private readonly service: PoisService) {}

  @Get()
  findNearby(@Query() dto: QueryPoisDto) {
    return this.service.findNearby(dto);
  }
}
