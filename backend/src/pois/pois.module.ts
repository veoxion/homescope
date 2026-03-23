import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PoisController } from './pois.controller';
import { PoisService } from './pois.service';

@Module({
  imports: [HttpModule],
  controllers: [PoisController],
  providers: [PoisService],
})
export class PoisModule {}
