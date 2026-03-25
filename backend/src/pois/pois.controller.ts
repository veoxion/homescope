import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PoisService } from './pois.service';
import { QueryPoisDto } from './dto/query-pois.dto';

@ApiTags('POIs')
@Controller('pois')
export class PoisController {
  constructor(private readonly service: PoisService) {}

  @Get()
  findNearby(@Query() dto: QueryPoisDto) {
    return this.service.findNearby(dto);
  }
}
