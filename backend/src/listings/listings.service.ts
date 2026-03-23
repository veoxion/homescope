import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryListingsDto } from './dto/query-listings.dto';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async findInBounds(dto: QueryListingsDto) {
    const residenceTypeList = dto.residenceTypes
      ? dto.residenceTypes.split(',')
      : undefined;

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const offset = (page - 1) * limit;

    const rows = await this.prisma.$queryRaw`
      SELECT
        l.*,
        b.address,
        b.building_name,
        b.residence_type,
        b.build_year,
        ST_Y(b.location::geometry) AS lat,
        ST_X(b.location::geometry) AS lng
      FROM listings l
      JOIN buildings b ON b.id = l.building_id
      WHERE l.status = 'ACTIVE'
        AND ST_Within(
          b.location::geometry,
          ST_MakeEnvelope(${dto.swLng}, ${dto.swLat}, ${dto.neLng}, ${dto.neLat}, 4326)
        )
        ${dto.tradeType ? Prisma.sql`AND l.trade_type = ${dto.tradeType}` : Prisma.empty}
        ${residenceTypeList?.length ? Prisma.sql`AND b.residence_type = ANY(${residenceTypeList}::text[])` : Prisma.empty}
        ${dto.priceMin != null ? Prisma.sql`AND l.sale_price >= ${dto.priceMin}` : Prisma.empty}
        ${dto.priceMax != null ? Prisma.sql`AND l.sale_price <= ${dto.priceMax}` : Prisma.empty}
        ${dto.depositMin != null ? Prisma.sql`AND l.deposit >= ${dto.depositMin}` : Prisma.empty}
        ${dto.depositMax != null ? Prisma.sql`AND l.deposit <= ${dto.depositMax}` : Prisma.empty}
        ${dto.monthlyRentMin != null ? Prisma.sql`AND l.monthly_rent >= ${dto.monthlyRentMin}` : Prisma.empty}
        ${dto.monthlyRentMax != null ? Prisma.sql`AND l.monthly_rent <= ${dto.monthlyRentMax}` : Prisma.empty}
        ${dto.areaMin != null ? Prisma.sql`AND l.area_m2 >= ${dto.areaMin}` : Prisma.empty}
        ${dto.areaMax != null ? Prisma.sql`AND l.area_m2 <= ${dto.areaMax}` : Prisma.empty}
      ORDER BY l.listed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows;
  }

  async findById(id: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT
        l.*,
        b.address,
        b.building_name,
        b.residence_type,
        b.build_year,
        ST_Y(b.location::geometry) AS lat,
        ST_X(b.location::geometry) AS lng
      FROM listings l
      JOIN buildings b ON b.id = l.building_id
      WHERE l.id = ${id}::uuid
    `;
    const listing = (rows as any[])[0];
    if (!listing) throw new NotFoundException('매물을 찾을 수 없습니다.');
    return listing;
  }

  async findByBuilding(buildingId: string) {
    return this.prisma.listing.findMany({
      where: { buildingId, status: 'ACTIVE' },
      orderBy: { listedAt: 'desc' },
    });
  }

  async create(dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        buildingId: dto.buildingId,
        tradeType: dto.tradeType,
        salePrice: dto.salePrice,
        jeonsePrice: dto.jeonsePrice,
        deposit: dto.deposit,
        monthlyRent: dto.monthlyRent,
        areaM2: dto.areaM2,
        floor: dto.floor,
        roomCount: dto.roomCount,
      },
    });
  }

  async update(id: string, dto: UpdateListingDto) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('매물을 찾을 수 없습니다.');

    return this.prisma.listing.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('매물을 찾을 수 없습니다.');

    await this.prisma.listing.delete({ where: { id } });
    return { deleted: true };
  }
}
