import { Controller, Get, Post, Patch, Delete, Param, Query, Body } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { QueryListingsDto } from './dto/query-listings.dto';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly service: ListingsService) {}

  @Post()
  create(@Body() dto: CreateListingDto) {
    return this.service.create(dto);
  }

  @Get()
  findInBounds(@Query() dto: QueryListingsDto) {
    return this.service.findInBounds(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
