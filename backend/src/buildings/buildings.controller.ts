import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { QueryBuildingsDto, SearchBuildingsDto } from './dto/query-buildings.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { MarketPricesService } from '../market-prices/market-prices.service';
import { ListingsService } from '../listings/listings.service';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';

@ApiTags('Buildings')
@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly service: BuildingsService,
    private readonly transactionsService: TransactionsService,
    private readonly marketPricesService: MarketPricesService,
    private readonly listingsService: ListingsService,
  ) {}

  @Post()
  @UseGuards(AdminApiKeyGuard)
  create(@Body() dto: CreateBuildingDto) {
    return this.service.create(dto);
  }

  @Get()
  findInBounds(@Query() dto: QueryBuildingsDto) {
    return this.service.findInBounds(dto);
  }

  @Get('search')
  search(@Query() dto: SearchBuildingsDto) {
    return this.service.search(dto);
  }

  @Get('clusters')
  getClusters(@Query() dto: QueryBuildingsDto) {
    return this.service.getClusters(dto);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @UseGuards(AdminApiKeyGuard)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Get(':buildingId/listings')
  findListingsByBuilding(@Param('buildingId') buildingId: string) {
    return this.listingsService.findByBuilding(buildingId);
  }

  @Get(':buildingId/transactions')
  findTransactionsByBuilding(@Param('buildingId') buildingId: string) {
    return this.transactionsService.findByBuilding(buildingId);
  }

  @Get(':buildingId/market-prices')
  findMarketPricesByBuilding(@Param('buildingId') buildingId: string) {
    return this.marketPricesService.findByBuilding(buildingId);
  }
}
